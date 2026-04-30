function assertIsNamespaceObject(ns) {
	if (typeof ns !== "object" || ns === null) {
		throw new TypeError("namespace is not an object");
	}
}

// The exact module bytes that `wast-loader` produces for `module.wat`. The
// test uses Node.js's platform `WebAssembly.instantiate` API on these bytes
// as a reference for "what Node.js does with this module" and asserts that
// webpack's deferred wasm namespace produces identical results.
//
// Why `WebAssembly.instantiate` and not `webpackIgnore: true` + dynamic
// `import`: Node.js does not yet implement the `import defer` syntax (TC39
// stage 3, targeted for Node ~24), and webpack's test VM intercepts dynamic
// `import("./x.wasm")` so it cannot reach Node.js's native wasm loader. The
// platform API is the most direct comparison and shares the same v8 wasm
// engine that Node.js's `import("./x.wasm")` uses internally.
const referenceBytes = new Uint8Array([
	0, 97, 115, 109, 1, 0, 0, 0, 1, 11, 2, 96, 2, 127, 127, 1, 127, 96, 0, 1,
	127, 3, 3, 2, 0, 1, 7, 19, 2, 3, 97, 100, 100, 0, 0, 9, 103, 101, 116, 78,
	117, 109, 98, 101, 114, 0, 1, 10, 14, 2, 7, 0, 32, 0, 32, 1, 106, 11, 4, 0,
	65, 42, 11
]);

const nodeJsReference = async () => {
	const { instance } = await WebAssembly.instantiate(referenceBytes);
	return instance.exports;
};

it("should match Node.js for dynamic `import.defer` of an async wasm module", async () => {
	const dyn = await import.defer("./module.wat");
	const ref = await nodeJsReference();

	assertIsNamespaceObject(dyn);
	expect(typeof dyn.add).toBe("function");
	expect(typeof dyn.getNumber).toBe("function");

	// Same exported function semantics as Node.js's native wasm instance.
	expect(dyn.add(2, 3)).toBe(ref.add(2, 3));
	expect(dyn.add(7, 8)).toBe(ref.add(7, 8));
	expect(dyn.getNumber()).toBe(ref.getNumber());
	expect(dyn.add(2, 3)).toBe(5);
	expect(dyn.getNumber()).toBe(42);

	// `import.defer` honors `webpackMode` magic comments — eager mode resolves
	// without a separate chunk request, but the observable namespace shape is
	// identical to the regular dynamic form (and to Node.js).
	const eager = await import.defer(/* webpackMode: "eager" */ "./module.wat");
	assertIsNamespaceObject(eager);
	expect(eager.add(40, 2)).toBe(ref.add(40, 2));
	expect(eager.getNumber()).toBe(ref.getNumber());
});

it("should expose only the wasm exports on the deferred namespace", async () => {
	const dyn = await import.defer("./module.wat");

	// Wasm modules expose their exports as named bindings (no `default`).
	expect(typeof dyn.add).toBe("function");
	expect(typeof dyn.getNumber).toBe("function");
	expect(Reflect.has(dyn, "add")).toBe(true);
	expect(Reflect.has(dyn, "getNumber")).toBe(true);
	expect(Reflect.has(dyn, "default")).toBe(false);
});

// Note: side-effect-counter-style deferral verification (the canonical pattern
// from `defer-runtime/all.js`) does not currently work for async wasm modules.
// A JS wrapper that imports the async wasm becomes top-level-async itself,
// which means: (a) `import defer * as` of the wrapper makes the bundle
// top-level-async and the test framework cannot register `it()` calls; and
// (b) dynamic `import.defer` of the wrapper resolves to a proxy that does not
// re-await the async wasm dep on first access, so wasm exports read as
// `undefined` even after evaluation. The deferral guarantee for synchronous
// modules is exercised by the JSON, asset, and CSS tests.
