import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import brokenPage from "./broken-page.html";
import page from "./page.html";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (file) => fs.readFileSync(path.resolve(here, file), "utf-8");
const manifestOf = (html) => read(html.match(/href="([^"]+\.webmanifest)"/)[1]);

it("should rewrite icon URLs in a manifest with a BOM, unquoted keys and non-ASCII text", () => {
	// the ranges are byte offsets into the raw manifest, so neither the BOM nor
	// the multi-byte `é` ahead of the icons may shift the rewritten URL
	const manifest = manifestOf(page)
		.replace("﻿", "<BOM>")
		.replace(/\b[0-9a-f]{16,}\.png\b/g, "<hash>.png");
	expect(manifest).toMatchSnapshot();
});

it("should emit the bundled icon and skip the other URLs", () => {
	const icon = manifestOf(page).match(/"([0-9a-f]{16,}\.png)"/)[1];
	expect(fs.existsSync(path.resolve(here, icon))).toBe(true);
	// the remote icon needs `experiments.buildHttp`, so it stays external
	expect(fs.existsSync(path.resolve(here, "remote.png"))).toBe(false);
});

it("should leave an unparsable manifest untouched", () => {
	expect(manifestOf(brokenPage)).toBe(
		'{ "icons": [ { "src": ./broken.png } ] }\n'
	);
});
