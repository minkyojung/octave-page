import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
	const migrations = await readD1Migrations(path.join(import.meta.dirname, "migrations"));
	return {
		plugins: [
			cloudflareTest({
				wrangler: { configPath: "./wrangler.jsonc" },
				miniflare: {
					bindings: {
						TEST_MIGRATIONS: migrations,
						SITE_URL: "https://www.octave.run",
						GITHUB_CLIENT_ID: "test-client-id",
						GITHUB_CLIENT_SECRET: "test-client-secret",
					},
				},
			}),
		],
		test: { setupFiles: ["./test/apply-migrations.ts"] },
	};
});
