import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import page from "./page.html";

const here = path.dirname(fileURLToPath(import.meta.url));
// Built from parts so this bundle never holds the loader's output text.
const LOADER_OUTPUT = ["changed", "by", "loader"].join(" ");

it("should run inline loaders named in an HTML URL", () => {
	const images = [];
	const imageRegExp = /<img src="([^"]+)" alt="">/g;
	for (let match; (match = imageRegExp.exec(page)) !== null; ) {
		images.push(match[1]);
	}
	expect(images).toHaveLength(2);
	const [loaded, plain] = images.map((file) =>
		fs.readFileSync(path.resolve(here, file), "utf-8")
	);
	expect(loaded).toContain(LOADER_OUTPUT);
	expect(plain).not.toContain(LOADER_OUTPUT);
});

it("should treat a web manifest URL as a file URL, not a loader request", () => {
	const manifestFile = /** @type {RegExpMatchArray} */ (
		page.match(/<link rel="manifest" href="([^"]+\.webmanifest)">/)
	)[1];
	const manifest = JSON.parse(
		fs.readFileSync(path.resolve(here, manifestFile), "utf-8")
	);
	expect(manifest.icons[1].src).toMatch(/^[0-9a-f]+\.svg$/);
	expect(JSON.stringify(manifest)).not.toContain(LOADER_OUTPUT);
});
