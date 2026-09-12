it("should hash ids against the path a file URL context names", function () {
	expect(require("./a")).toBe("a");
	expect(require("./b")).toBe("b");
	// A file URL left unconverted makes the identifiers absolute, so these
	// ids would be machine-dependent rather than the ones below.
	expect(Object.keys(__webpack_modules__).sort()).toEqual([
		"KpHw",
		"QfWi",
		"xEH0"
	]);
});
