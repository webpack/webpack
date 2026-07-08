import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import page from "./page.html";

const here = path.dirname(fileURLToPath(import.meta.url));

it("should emit a <script type=application/wasm src> as a bundled wasm asset and rewrite its src", () => {
	expect(typeof page).toBe("string");
	expect(page).toMatchSnapshot();
	// A `<script type="application/wasm">` is not executable JS, so it is not
	// bundled as an entry; its `src` is emitted as a hashed wasm asset, like
	// a wasm module referenced from JS.
	expect(page).not.toContain('src="./add.wasm"');
	const match = page.match(
		/<script type="application\/wasm" src="([^"]+\.wasm)">/
	);
	expect(match).not.toBeNull();
	const wasmUrl = /** @type {RegExpMatchArray} */ (match)[1];
	expect(wasmUrl).toMatch(/^[0-9a-f]+\.wasm$/);

	// The emitted wasm is byte-identical to the source, so it still instantiates
	// (synchronous API — the sandbox does not pump promise microtasks).
	const bytes = fs.readFileSync(path.resolve(here, wasmUrl));
	const instance = new WebAssembly.Instance(new WebAssembly.Module(bytes), {});
	expect(instance.exports.add(2, 3)).toBe(5);
});
