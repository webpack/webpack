import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import page from "./page.html";

const here = path.dirname(fileURLToPath(import.meta.url));

const readChunk = (name) => fs.readFileSync(path.resolve(here, name), "utf-8");

// In this fixture `output.module` is on, so the parser auto-upgrades classic
// `<script src>` to `<script type="module" src>` and every script tag in the
// emitted HTML looks the same. The four chunks appear in document order:
// classic-a, module-a, classic-b, module-b.
const scriptChunkUrls = [
	...page.matchAll(/<script[^>]*\bsrc="(__html_[^"]+\.chunk\.js)">/g)
].map((m) => m[1]);

const chunkContaining = (substr) =>
	scriptChunkUrls.map(readChunk).find((c) => c.includes(substr));

it("should bundle multiple classic and module scripts in one HTML", () => {
	expect(typeof page).toBe("string");
	expect(page).toMatchSnapshot();
	expect(page).not.toContain('src="./classic-a.js"');
	expect(page).not.toContain('src="./classic-b.js"');
	expect(page).not.toContain('src="./module-a.js"');
	expect(page).not.toContain('src="./module-b.js"');
	expect(scriptChunkUrls).toHaveLength(4);
});

it("should chain multiple classic <script src> via dependOn", () => {
	const classicA = chunkContaining('"classic-a value"');
	const classicB = chunkContaining('"classic-b value"');
	expect(classicA).toMatchSnapshot();
	expect(classicB).toMatchSnapshot();
	// classic-a is the classic-group leader and owns the runtime.
	expect(classicA).toContain("function __webpack_require__(moduleId)");
	// classic-b consumes the leader's runtime via dependOn.
	expect(classicB).not.toContain("function __webpack_require__(moduleId)");
});

it("should chain multiple <script type=module src> via dependOn and share modules across them", () => {
	const moduleA = chunkContaining('"module-a value"');
	const moduleB = chunkContaining("module-b sees:");
	expect(moduleA).toMatchSnapshot();
	expect(moduleB).toMatchSnapshot();
	// module-a is the esm-script-group leader and owns the runtime.
	expect(moduleA).toContain("function __webpack_require__(moduleId)");
	expect(moduleA).toContain("harmony export");
	// module-b shares the runtime via dependOn — no own bootstrap.
	expect(moduleB).not.toContain("function __webpack_require__(moduleId)");
	// And module-a's source is NOT duplicated into module-b's chunk — the
	// import resolves through the shared runtime instead.
	expect(moduleB).not.toContain('"module-a value"');
});

it("should not mix classic and module entries in the same runtime group", () => {
	// Both leaders carry their own runtime — they don't share modules
	// across the classic/esm-script split.
	const classicA = chunkContaining('"classic-a value"');
	const moduleA = chunkContaining('"module-a value"');
	expect(classicA).toContain("function __webpack_require__(moduleId)");
	expect(moduleA).toContain("function __webpack_require__(moduleId)");
});
