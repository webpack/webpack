import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import page from "./page.html";

const here = path.dirname(fileURLToPath(import.meta.url));

const readChunk = (name) => fs.readFileSync(path.resolve(here, name), "utf-8");

const collectChunks = (regex) =>
	[...page.matchAll(regex)].map((m) => m[1]);

it("should bundle multiple classic and module scripts in one HTML", () => {
	expect(typeof page).toBe("string");
	expect(page).toMatchSnapshot();
	// Each <script src> got rewritten to a synthetic chunk URL.
	expect(page).not.toContain('src="./classic-a.js"');
	expect(page).not.toContain('src="./classic-b.js"');
	expect(page).not.toContain('src="./module-a.js"');
	expect(page).not.toContain('src="./module-b.js"');
});

it("should chain multiple classic <script src> via dependOn", () => {
	// Classic scripts: only `<script src=>` without type=module.
	const classicChunks = collectChunks(
		/<script src="(__html_[^"]+\.chunk\.js)">/g
	);
	expect(classicChunks).toHaveLength(2);
	const first = readChunk(classicChunks[0]);
	expect(first).toMatchSnapshot();
	// The first classic chunk owns the webpack runtime.
	expect(first).toContain("function __webpack_require__(moduleId)");
	expect(first).toContain('"classic-a value"');
	const second = readChunk(classicChunks[1]);
	expect(second).toMatchSnapshot();
	// Subsequent classic chunks have no runtime — they consume the first
	// chunk's runtime via dependOn.
	expect(second).not.toContain("function __webpack_require__(moduleId)");
	expect(second).toContain('"classic-b value"');
});

it("should chain multiple <script type=module src> via dependOn and share modules across them", () => {
	const moduleChunks = collectChunks(
		/<script type="module" src="(__html_[^"]+\.chunk\.js)">/g
	);
	expect(moduleChunks).toHaveLength(2);

	const a = readChunk(moduleChunks[0]);
	expect(a).toMatchSnapshot();
	// module-a owns the runtime for the esm group.
	expect(a).toContain("function __webpack_require__(moduleId)");
	expect(a).toContain('"module-a value"');
	// ESM-parsed: harmony export helpers wire up the `export const moduleA`.
	expect(a).toContain("harmony export");

	const b = readChunk(moduleChunks[1]);
	expect(b).toMatchSnapshot();
	// module-b shares the runtime via dependOn; no runtime bootstrap here.
	expect(b).not.toContain("function __webpack_require__(moduleId)");
	// Importantly: module-a's source is NOT duplicated into module-b's chunk
	// — module-b's import of `./module-a.js` resolves through the shared
	// runtime instead of inlining the module.
	expect(b).not.toContain('"module-a value"');
	expect(b).toContain("module-b sees:");
});

it("should not mix classic and module entries in the same runtime group", () => {
	// Classic and module groups have separate dependOn chains, so each group
	// gets its own runtime — they don't share modules.
	const classicChunks = collectChunks(
		/<script src="(__html_[^"]+\.chunk\.js)">/g
	);
	const moduleChunks = collectChunks(
		/<script type="module" src="(__html_[^"]+\.chunk\.js)">/g
	);
	const classicFirst = readChunk(classicChunks[0]);
	const moduleFirst = readChunk(moduleChunks[0]);
	// Both group leaders carry their own runtime.
	expect(classicFirst).toContain("function __webpack_require__(moduleId)");
	expect(moduleFirst).toContain("function __webpack_require__(moduleId)");
});
