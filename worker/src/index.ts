// Sign-up with GitHub for octave.run.
//
// GET /auth/github/start     → sets a short-lived cookie holding the OAuth
//                              state and PKCE verifier, sends the person to GitHub.
// GET /auth/github/callback  → checks the state, trades the code for a token,
//                              reads the profile and email, keeps them in D1,
//                              revokes the token, sends the person back to the site.
//
// The token is used for those two reads and then revoked; nothing else is kept.
// Every outcome ends at SITE_URL with ?signup=ok|cancelled|error, so the site
// has one place to say what happened.

const GITHUB_AUTHORIZE = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN = "https://github.com/login/oauth/access_token";
const GITHUB_API = "https://api.github.com";
const SCOPE = "read:user user:email";
const COOKIE = "__Host-octave-oauth";
const COOKIE_MAX_AGE = 600;
const UPSTREAM_TIMEOUT_MS = 10_000;

type Outcome = "ok" | "cancelled" | "error";

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const route = url.pathname === "/auth/github/start" ? start : url.pathname === "/auth/github/callback" ? callback : null;
		if (!route) return new Response("Not found", { status: 404 });
		if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers: { Allow: "GET" } });

		if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
			console.error("sign-up is not configured: GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is empty");
			return redirect(siteUrl(env, "error"), cookie("", 0));
		}

		const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
		if (!(await env.LIMITER.limit({ key: ip })).success) return new Response("Too many requests", { status: 429 });

		return route(request, env, ctx, url);
	},
} satisfies ExportedHandler<Env>;

async function start(_request: Request, env: Env, _ctx: ExecutionContext, url: URL): Promise<Response> {
	const state = randomToken();
	const verifier = randomToken();
	const updates = url.searchParams.get("updates") === "1" ? "1" : "0";

	const authorize = new URL(GITHUB_AUTHORIZE);
	authorize.search = new URLSearchParams({
		client_id: env.GITHUB_CLIENT_ID,
		redirect_uri: callbackUrl(url),
		scope: SCOPE,
		state,
		code_challenge: await challengeFor(verifier),
		code_challenge_method: "S256",
	}).toString();

	return redirect(authorize.toString(), cookie(`${state}.${verifier}.${updates}`, COOKIE_MAX_AGE));
}

async function callback(request: Request, env: Env, ctx: ExecutionContext, url: URL): Promise<Response> {
	const saved = readCookie(request, COOKIE)?.split(".");
	const params = url.searchParams;
	const finish = (outcome: Outcome) => redirect(siteUrl(env, outcome), cookie("", 0));

	// GitHub sends error=access_denied when the person presses Cancel.
	if (params.get("error") === "access_denied") return finish("cancelled");

	const code = params.get("code");
	if (!saved || saved.length !== 3 || !code || !sameString(params.get("state") ?? "", saved[0])) return finish("error");
	const [, verifier, updates] = saved;

	try {
		const token = await exchangeCode(env, code, verifier, callbackUrl(url));
		try {
			const [user, emails] = await Promise.all([github<GitHubUser>("/user", token), github<GitHubEmail[]>("/user/emails", token)]);
			await saveUser(env.DB, user, chooseEmail(emails), updates === "1");
		} finally {
			ctx.waitUntil(revoke(env, token));
		}
		return finish("ok");
	} catch (err) {
		console.error("sign-up failed:", err instanceof Error ? err.message : String(err));
		return finish("error");
	}
}

interface GitHubUser {
	id: number;
	login: string;
	name: string | null;
	avatar_url: string | null;
	bio: string | null;
	company: string | null;
	location: string | null;
	blog: string | null;
	followers: number | null;
	public_repos: number | null;
	created_at: string | null;
}

interface GitHubEmail {
	email: string;
	primary: boolean;
	verified: boolean;
}

async function exchangeCode(env: Env, code: string, verifier: string, redirectUri: string): Promise<string> {
	const res = await fetch(GITHUB_TOKEN, {
		method: "POST",
		headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "octave-signup" },
		body: new URLSearchParams({
			client_id: env.GITHUB_CLIENT_ID,
			client_secret: env.GITHUB_CLIENT_SECRET,
			code,
			redirect_uri: redirectUri,
			code_verifier: verifier,
		}),
		signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
	});
	// GitHub answers a bad code with 200 and an `error` field, so both are checked.
	const body = (await res.json().catch(() => ({}))) as { access_token?: string; error?: string };
	if (!res.ok || !body.access_token) throw new Error(`token exchange: ${res.status} ${body.error ?? "no access_token"}`);
	return body.access_token;
}

async function github<T>(path: string, token: string): Promise<T> {
	const res = await fetch(GITHUB_API + path, {
		headers: githubHeaders(`Bearer ${token}`),
		signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
	});
	if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
	return res.json();
}

// The token has done its job; revoking it means a leak of our logs or database
// could never be turned into access to anyone's GitHub account.
async function revoke(env: Env, token: string): Promise<void> {
	const res = await fetch(`${GITHUB_API}/applications/${env.GITHUB_CLIENT_ID}/token`, {
		method: "DELETE",
		headers: { ...githubHeaders(`Basic ${btoa(`${env.GITHUB_CLIENT_ID}:${env.GITHUB_CLIENT_SECRET}`)}`), "Content-Type": "application/json" },
		body: JSON.stringify({ access_token: token }),
		signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
	}).catch((err: unknown) => err);
	if (!(res instanceof Response) || res.status !== 204) {
		console.error("token revoke failed:", res instanceof Response ? res.status : String(res));
	}
}

function githubHeaders(authorization: string): Record<string, string> {
	return {
		Accept: "application/vnd.github+json",
		Authorization: authorization,
		"User-Agent": "octave-signup",
		"X-GitHub-Api-Version": "2022-11-28",
	};
}

function chooseEmail(emails: GitHubEmail[]): string | null {
	const verified = emails.filter((e) => e.verified);
	return (verified.find((e) => e.primary) ?? verified[0])?.email ?? null;
}

async function saveUser(db: D1Database, user: GitHubUser, email: string | null, updates: boolean): Promise<void> {
	const now = new Date().toISOString();
	// One statement, so two sign-ins at once cannot race between a read and a write.
	await db
		.prepare(
			`INSERT INTO users (github_id, login, name, email, avatar_url, bio, company, location, blog,
				followers, public_repos, github_created_at, updates_opt_in, updates_opt_in_at, created_at, last_signed_in_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(github_id) DO UPDATE SET
				login = excluded.login,
				name = excluded.name,
				email = COALESCE(excluded.email, users.email),
				avatar_url = excluded.avatar_url,
				bio = excluded.bio,
				company = excluded.company,
				location = excluded.location,
				blog = excluded.blog,
				followers = excluded.followers,
				public_repos = excluded.public_repos,
				github_created_at = excluded.github_created_at,
				updates_opt_in = MAX(users.updates_opt_in, excluded.updates_opt_in),
				updates_opt_in_at = COALESCE(users.updates_opt_in_at, excluded.updates_opt_in_at),
				last_signed_in_at = excluded.last_signed_in_at`,
		)
		.bind(
			user.id,
			user.login,
			user.name,
			email,
			user.avatar_url,
			user.bio,
			user.company,
			user.location,
			user.blog || null,
			user.followers,
			user.public_repos,
			user.created_at,
			updates ? 1 : 0,
			updates ? now : null,
			now,
			now,
		)
		.run();
}

function callbackUrl(url: URL): string {
	return `${url.origin}/auth/github/callback`;
}

function siteUrl(env: Env, outcome: Outcome): string {
	const site = new URL(env.SITE_URL);
	site.searchParams.set("signup", outcome);
	return site.toString();
}

function redirect(location: string, setCookie: string): Response {
	return new Response(null, {
		status: 302,
		headers: { Location: location, "Set-Cookie": setCookie, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
	});
}

function cookie(value: string, maxAge: number): string {
	return `${COOKIE}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

function readCookie(request: Request, name: string): string | undefined {
	for (const part of (request.headers.get("Cookie") ?? "").split(";")) {
		const [key, ...rest] = part.trim().split("=");
		if (key === name) return rest.join("=") || undefined;
	}
	return undefined;
}

function randomToken(): string {
	return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

async function challengeFor(verifier: string): Promise<string> {
	return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
}

function base64url(bytes: Uint8Array): string {
	return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sameString(a: string, b: string): boolean {
	const enc = new TextEncoder();
	const x = enc.encode(a);
	const y = enc.encode(b);
	return x.byteLength === y.byteLength && crypto.subtle.timingSafeEqual(x, y);
}
