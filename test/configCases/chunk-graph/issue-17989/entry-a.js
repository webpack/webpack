import loadModule from "./shared"

it("should not have a.add from entry-a + entry-b", () => {
	return loadModule().then(module => {
		const { arg } = module;
		expect(arg).toBe(42)
		expect(typeof __webpack_modules__["./util2.js"]).toBe("function")
		expect(require.cache["./util2.js"]).toBe(undefined); // not loaded on __webpack_require__.c["./util2.js"]
	});
});
