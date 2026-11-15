it("should report the warnings of a restored module's importers again", () => {
	if (WATCH_STEP === "1") {
		expect(() => require("./importer")).toThrow(/Cannot find module/);
		return;
	}
	expect(require("./importer").value).toBe(undefined);
	expect(require("./barrel").a).toBe(undefined);
	// the warning is conflict.js's, the missing module is star.js's, which
	// conflict.js reaches through a re-export
	expect(require("./conflict").value).toBe(undefined);
	// walk-x.js is reached directly from one missing module and through a
	// re-export from another, and only the second reaches walk.js
	expect(require("./walk").value).toBe(undefined);
});
