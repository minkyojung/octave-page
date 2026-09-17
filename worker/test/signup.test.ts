import { env, exports } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGIN = "https://signup.example";
const SITE = "https://www.octave.run";
const COOKIE = "__Host-octave-oauth";

// The limiter is per IP and outlives a test, so each test comes from its own address.
let ip = "";

const profile = {
	id: 42,
	login: "ada",
	name: "Ada Lovelace",
	avatar_url: "https://avatars.githubusercontent.com/u/42",
	bio: "Notes",
	company: "Analytical",
	location: "London",
	blog: "",
	followers: 7,
	public_repos: 3,
	created_at: "2015-01-01T00:00:00Z",
};

const emails = [
	{ email: "old@example.com", primary: false, verified: true },
	{ email: "ada@example.com", primary: true, verified: true },
];

interface Calls {
	token: URLSearchParams[];
	revoked: string[];
	api: string[];
}

// Stands in for GitHub. Each test can replace one answer.
function mockGitHub(overrides: Partial<Record<"token" | "user" | "emails", () => Response>> = {}): Calls {
	const calls: Calls = { token: [], revoked: [], api: [] };
	vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
		const req = new Request(input, init);
		const url = new URL(req.url);
		if (url.href === "https://github.com/login/oauth/access_token") {
			calls.token.push(new URLSearchParams(new TextDecoder().decode(await req.arrayBuffer())));
			return overrides.token?.() ?? Response.json({ access_token: "gho_test", token_type: "bearer", scope: "read:user,user:email" });
		}
		if (url.href === "https://api.github.com/applications/test-client-id/grant" && req.method === "DELETE") {
			expect(req.headers.get("Authorization")).toBe(`Basic ${btoa("test-client-id:test-client-secret")}`);
			calls.revoked.push(((await req.json()) as { access_token: string }).access_token);
			return new Response(null, { status: 204 });
		}
		calls.api.push(url.pathname);
		expect(req.headers.get("Authorization")).toBe("Bearer gho_test");
		if (url.href === "https://api.github.com/user") return overrides.user?.() ?? Response.json(profile);
		if (url.href === "https://api.github.com/user/emails") return overrides.emails?.() ?? Response.json(emails);
		throw new Error(`unexpected fetch ${req.method} ${url.href}`);
	});
	return calls;
}

// Starts from our page by default, as the button on it does.
async function begin(query = "", referer: string | null = `${SITE}/`): Promise<{ state: string; verifier: string; cookie: string; location: URL }> {
	const headers: Record<string, string> = { "cf-connecting-ip": ip };
	if (referer) headers.Referer = referer;
	const res = await exports.default.fetch(`${ORIGIN}/auth/github/start${query}`, { redirect: "manual", headers });
	expect(res.status).toBe(302);
	const setCookie = res.headers.get("Set-Cookie")!;
	const value = setCookie.split(";")[0].slice(COOKIE.length + 1);
	const [state, verifier] = value.split(".");
	return { state, verifier, cookie: `${COOKIE}=${value}`, location: new URL(res.headers.get("Location")!) };
}

async function finish(query: string, cookie?: string): Promise<{ res: Response; outcome: string | null }> {
	const res = await exports.default.fetch(`${ORIGIN}/auth/github/callback?${query}`, {
		redirect: "manual",
		headers: cookie ? { Cookie: cookie, "cf-connecting-ip": ip } : { "cf-connecting-ip": ip },
	});
	expect(res.status).toBe(302);
	const location = new URL(res.headers.get("Location")!);
	expect(location.origin).toBe(SITE);
	return { res, outcome: location.searchParams.get("signup") };
}

async function signUp(query = "", referer?: string | null): Promise<{ calls: Calls; outcome: string | null; res: Response }> {
	const calls = mockGitHub();
	const { state, cookie } = await begin(query, referer);
	const { res, outcome } = await finish(`code=abc&state=${state}`, cookie);
	return { calls, outcome, res };
}

function rows() {
	return env.DB.prepare("SELECT * FROM users").all<Record<string, unknown>>().then((r) => r.results);
}

beforeEach(async () => {
	ip = crypto.randomUUID();
	await env.DB.exec("DELETE FROM users");
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("start", () => {
	it("sends the person to GitHub with state and a PKCE challenge that match the cookie", async () => {
		const { state, verifier, location } = await begin();
		expect(location.origin + location.pathname).toBe("https://github.com/login/oauth/authorize");
		expect(location.searchParams.get("client_id")).toBe("test-client-id");
		expect(location.searchParams.get("redirect_uri")).toBe(`${ORIGIN}/auth/github/callback`);
		expect(location.searchParams.get("scope")).toBe("user:email");
		expect(location.searchParams.get("state")).toBe(state);
		expect(location.searchParams.get("code_challenge_method")).toBe("S256");

		const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
		const expected = btoa(String.fromCharCode(...digest)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
		expect(location.searchParams.get("code_challenge")).toBe(expected);
	});

	it("keeps the cookie to this host, out of scripts, and short-lived", async () => {
		const res = await exports.default.fetch(`${ORIGIN}/auth/github/start`, { redirect: "manual", headers: { "cf-connecting-ip": ip } });
		const setCookie = res.headers.get("Set-Cookie")!;
		expect(setCookie).toMatch(/^__Host-octave-oauth=/);
		for (const attr of ["Max-Age=600", "Path=/", "HttpOnly", "Secure", "SameSite=Lax"]) expect(setCookie).toContain(attr);
		expect(res.headers.get("Cache-Control")).toBe("no-store");
	});

	it("gives a different state every time", async () => {
		const a = await begin();
		const b = await begin();
		expect(a.state).not.toBe(b.state);
		expect(a.verifier).not.toBe(b.verifier);
	});
});

describe("callback", () => {
	it("keeps the profile and the verified primary email, then revokes the token", async () => {
		const { calls, outcome, res } = await signUp();
		expect(outcome).toBe("ok");
		expect(res.headers.get("Set-Cookie")).toContain("Max-Age=0");

		expect(calls.token).toHaveLength(1);
		expect(calls.token[0].get("code")).toBe("abc");
		expect(calls.token[0].get("client_secret")).toBe("test-client-secret");
		expect(calls.token[0].get("redirect_uri")).toBe(`${ORIGIN}/auth/github/callback`);
		expect(calls.token[0].get("code_verifier")).toBeTruthy();
		expect(calls.revoked).toEqual(["gho_test"]);

		const [row] = await rows();
		expect(row).toMatchObject({
			github_id: 42,
			login: "ada",
			name: "Ada Lovelace",
			email: "ada@example.com",
			company: "Analytical",
			blog: null,
			followers: 7,
			public_repos: 3,
			github_created_at: "2015-01-01T00:00:00Z",
			updates_opt_in: 0,
			updates_opt_in_at: null,
		});
	});

	it("sends the verifier that belongs to the challenge", async () => {
		const calls = mockGitHub();
		const { state, verifier, cookie } = await begin();
		await finish(`code=abc&state=${state}`, cookie);
		expect(calls.token[0].get("code_verifier")).toBe(verifier);
	});

	it("records consent to updates only when it was given", async () => {
		await signUp("?updates=1");
		const [row] = await rows();
		expect(row.updates_opt_in).toBe(1);
		expect(row.updates_opt_in_at).toBeTypeOf("string");
	});

	it("does not take consent from a link on another site, or from no page at all", async () => {
		for (const referer of ["https://evil.example/page", "https://octave.run.evil.example/", null]) {
			await env.DB.exec("DELETE FROM users");
			const { outcome } = await signUp("?updates=1", referer);
			vi.restoreAllMocks();
			expect(outcome).toBe("ok");
			const [row] = await rows();
			expect(row).toMatchObject({ updates_opt_in: 0, updates_opt_in_at: null });
		}
	});

	it("updates a returning account without losing when it joined or its consent", async () => {
		await signUp("?updates=1");
		const [first] = await rows();
		vi.restoreAllMocks();

		const calls = mockGitHub({ user: () => Response.json({ ...profile, login: "ada-renamed", followers: 8 }) });
		const { state, cookie } = await begin();
		await finish(`code=abc&state=${state}`, cookie);
		expect(calls.revoked).toHaveLength(1);

		const all = await rows();
		expect(all).toHaveLength(1);
		expect(all[0]).toMatchObject({
			login: "ada-renamed",
			followers: 8,
			created_at: first.created_at,
			updates_opt_in: 1,
			updates_opt_in_at: first.updates_opt_in_at,
		});
	});

	it("replaces the email with what GitHub says now", async () => {
		await signUp();
		vi.restoreAllMocks();
		mockGitHub({ emails: () => Response.json([]) });
		const { state, cookie } = await begin();
		await finish(`code=abc&state=${state}`, cookie);
		expect((await rows())[0].email).toBeNull();
	});

	it("falls back to another verified address, and to none", async () => {
		mockGitHub({ emails: () => Response.json([{ email: "x@example.com", primary: true, verified: false }, { email: "y@example.com", primary: false, verified: true }]) });
		let s = await begin();
		await finish(`code=abc&state=${s.state}`, s.cookie);
		expect((await rows())[0].email).toBe("y@example.com");
		vi.restoreAllMocks();

		await env.DB.exec("DELETE FROM users");
		mockGitHub({ emails: () => Response.json([{ email: "x@example.com", primary: true, verified: false }]) });
		s = await begin();
		await finish(`code=abc&state=${s.state}`, s.cookie);
		expect((await rows())[0].email).toBeNull();
	});

	it("says cancelled when the person declines on GitHub", async () => {
		const calls = mockGitHub();
		const { cookie } = await begin();
		const { outcome } = await finish("error=access_denied&error_description=denied&state=x", cookie);
		expect(outcome).toBe("cancelled");
		expect(calls.token).toHaveLength(0);
	});

	it("refuses a state that does not match the cookie", async () => {
		const calls = mockGitHub();
		const { cookie } = await begin();
		const { outcome } = await finish("code=abc&state=forged", cookie);
		expect(outcome).toBe("error");
		expect(calls.token).toHaveLength(0);
		expect(await rows()).toHaveLength(0);
	});

	it("refuses a callback with no cookie", async () => {
		const calls = mockGitHub();
		const { state } = await begin();
		const { outcome } = await finish(`code=abc&state=${state}`);
		expect(outcome).toBe("error");
		expect(calls.token).toHaveLength(0);
	});

	it("says error when GitHub rejects the code, and keeps nothing", async () => {
		const calls = mockGitHub({ token: () => Response.json({ error: "bad_verification_code" }) });
		const { state, cookie } = await begin();
		const { outcome } = await finish(`code=abc&state=${state}`, cookie);
		expect(outcome).toBe("error");
		expect(calls.api).toHaveLength(0);
		expect(await rows()).toHaveLength(0);
	});

	it("still revokes the token when reading the profile fails", async () => {
		const calls = mockGitHub({ user: () => new Response("boom", { status: 502 }) });
		const { state, cookie } = await begin();
		const { outcome } = await finish(`code=abc&state=${state}`, cookie);
		expect(outcome).toBe("error");
		expect(calls.revoked).toEqual(["gho_test"]);
		expect(await rows()).toHaveLength(0);
	});
});

describe("routing", () => {
	it("answers 404 elsewhere and 405 to other methods", async () => {
		expect((await exports.default.fetch(`${ORIGIN}/`)).status).toBe(404);
		expect((await exports.default.fetch(`${ORIGIN}/auth/github/start`, { method: "POST" })).status).toBe(405);
	});

	it("turns away an address that keeps asking", async () => {
		const statuses = [];
		let last = "";
		for (let i = 0; i < 21; i++) {
			const res = await exports.default.fetch(`${ORIGIN}/auth/github/start`, { redirect: "manual", headers: { "cf-connecting-ip": ip } });
			statuses.push(res.status);
			last = res.headers.get("Location")!;
		}
		expect(last).toBe(`${SITE}/?signup=error`);
		expect(statuses.slice(0, 20).every((s) => s === 302)).toBe(true);
		// Turned away, but back on the site with something to say.
		expect(statuses[20]).toBe(302);
	});
});
