import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import page from "./page.html";

const here = path.dirname(fileURLToPath(import.meta.url));
// Built from parts so this bundle never holds the loader's output text.
const LOADER_OUTPUT = ["changed", "by", "loader"].join(" ");

it("should treat a URL in HTML or a web manifest as a file URL, not a loader request", () => {
	const manifestFile = /** @type {RegExpMatchArray} */ (
		page.match(/<link rel="manifest" href="([^"]+\.webmanifest)">/)
	)[1];
	const manifest = JSON.parse(
		fs.readFileSync(path.resolve(here, manifestFile), "utf-8")
	);
	expect(manifest.icons[1].src).toMatch(/^[0-9a-f]+\.svg$/);
	expect(page).toMatch(/<img src="[0-9a-f]+\.svg" alt="">/);

	for (const file of fs.readdirSync(here)) {
		if (/\.(?:svg|webmanifest|html)$/.test(file)) {
			expect(fs.readFileSync(path.join(here, file), "utf-8")).not.toContain(
				LOADER_OUTPUT
			);
		}
	}
});
