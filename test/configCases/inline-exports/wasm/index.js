const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should not break wasm import/export when exports are inlined", () =>
	import(/* webpackChunkName: "wasm-chunk" */ "./module").then(
		({ v, w, x, test }) => {
			if (WebAssembly.Global) {
				expect(v.constructor).toBe(WebAssembly.Global);
				expect(w.constructor).toBe(WebAssembly.Global);
				expect(x.constructor).toBe(WebAssembly.Global);

				expect(+v).toBe(1);
				expect(+w).toBe(1);
				expect(+x).toBe(2);
			} else {
				expect(v).toBe(1);
				expect(w).toBe(1);
				expect(x).toBe(2);
			}
			expect(test()).toBe(2);
		}
	));

it("should not inline values consumed by wasm import/export dependencies", () => {
	const chunk = /** @type {string} */ (
		fs.readFileSync(path.resolve(__dirname, "wasm-chunk.js"), "utf-8")
	);
	expect(chunk.includes("inlined export")).toBe(false);
});
