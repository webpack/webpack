const ids = Object.keys(__webpack_modules__).sort().join(",");

// The first bundle hashes its ids against a plain path and the second against
// the file URL naming it - an unconverted URL hashes other identifiers.
if (global.hashedModuleIdsContext === undefined) {
	global.hashedModuleIdsContext = ids;
}

it("should hash the same ids for a path and the file URL naming it", function () {
	expect(require("./a")).toBe("a");
	expect(require("./b")).toBe("b");
	expect(ids).toBe(global.hashedModuleIdsContext);
});
