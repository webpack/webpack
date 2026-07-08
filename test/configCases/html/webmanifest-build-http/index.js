import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import page from "./page.html";

const here = path.dirname(fileURLToPath(import.meta.url));

it("should bundle an absolute http(s) icon URL from a webmanifest when experiments.buildHttp is enabled", () => {
	const hrefMatch = page.match(
		/<link rel="manifest" href="([^"]+\.webmanifest)">/
	);
	expect(hrefMatch).not.toBeNull();
	const manifestFile = /** @type {RegExpMatchArray} */ (hrefMatch)[1];

	const manifest = JSON.parse(
		fs.readFileSync(path.resolve(here, manifestFile), "utf-8")
	);

	// The remote icon is fetched (from the lockfile cache) and rewritten to a
	// local, hashed asset instead of being left as an absolute URL.
	expect(manifest.icons[0].src).not.toContain("https://raw.githubusercontent.com");
	expect(manifest.icons[0].src).toMatch(/^[0-9a-f]+\.svg$/);
	expect(fs.existsSync(path.resolve(here, manifest.icons[0].src))).toBe(true);
});
