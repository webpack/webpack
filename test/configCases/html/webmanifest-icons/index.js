import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import page from "./page.html";

const here = path.dirname(fileURLToPath(import.meta.url));

it("should parse a <link rel=manifest> webmanifest and bundle its icon URLs", () => {
	expect(page).toMatchSnapshot();
	// The manifest href is rewritten to the emitted, hashed manifest.
	const hrefMatch = page.match(/<link rel="manifest" href="([^"]+\.webmanifest)">/);
	expect(hrefMatch).not.toBeNull();
	const manifestFile = /** @type {RegExpMatchArray} */ (hrefMatch)[1];
	expect(manifestFile).toMatch(/^[0-9a-f]+\.webmanifest$/);

	const manifest = JSON.parse(
		fs.readFileSync(path.resolve(here, manifestFile), "utf-8")
	);

	// Relative icon/screenshot/shortcut-icon URLs are bundled as hashed assets.
	const hashed = /^[0-9a-f]+\.png$/;
	expect(manifest.icons[0].src).toMatch(hashed);
	expect(manifest.icons[1].src).toMatch(hashed);
	expect(manifest.screenshots[0].src).toMatch(hashed);
	expect(manifest.shortcuts[0].icons[0].src).toMatch(hashed);
	// The emitted asset files exist.
	for (const src of [
		manifest.icons[0].src,
		manifest.icons[1].src,
		manifest.screenshots[0].src,
		manifest.shortcuts[0].icons[0].src
	]) {
		expect(fs.existsSync(path.resolve(here, src))).toBe(true);
	}

	// Absolute URLs and non-asset fields are left untouched.
	expect(manifest.icons[2].src).toBe("https://cdn.example.com/remote.png");
	expect(manifest.start_url).toBe("/");
	expect(manifest.scope).toBe("/app/");
	expect(manifest.shortcuts[0].url).toBe("/home");
});
