// A `.js` module auto-detected as ESM via `import.meta` stays `javascript/auto`
// (loose), so it is strict and namespaced but keeps CommonJS interop — unlike a
// strict `.mjs`/`type: "module"` module, where `module`/`require` are removed.
const url = import.meta.url;

function getThis() {
	return this;
}

it("should be a strict ES module but keep CommonJS interop", () => {
	// Detected as an ES module: import.meta resolves and the module is strict.
	expect(url.endsWith("index.js")).toBe(true);
	expect(getThis()).toBe(undefined);

	// Not strict-harmony (.mjs): `module`/`require` interop is still available.
	expect(typeof require).toBe("function");
	expect(typeof module).toBe("object");
	expect(module.id).toBeDefined();
	expect(require.cache[module.id]).toBeDefined();
	expect(require("fs")).toBe(require("fs"));
});
