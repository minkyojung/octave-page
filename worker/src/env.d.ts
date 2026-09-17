// Secrets are not in wrangler.jsonc, so `wrangler types` cannot see them.
interface Secrets {
	GITHUB_CLIENT_SECRET: string;
}
interface Env extends Secrets {}
declare namespace Cloudflare {
	interface Env extends Secrets {}
}
