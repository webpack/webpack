it("keeps a missing-module throw for an unused ignored getter reexport", () => {
	expect(() => {
		require("./folder-b/lib.cjs");
	}).toThrow(/Cannot find module/);
	const src = String(__webpack_modules__["./folder-b/lib.cjs"]);
	expect(src).toMatch(/webpackMissingModule/);
	expect(src).not.toMatch(/\/\* unused reexport \*\/ 0/);
});
