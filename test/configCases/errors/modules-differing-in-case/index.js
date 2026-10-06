// Identifiers differing only in the query's casing stand in for two files
// differing only in casing, which no checkout can hold on every filesystem.
it("should keep modules differing only in casing apart", function () {
	expect(require("./file.js?A")).not.toBe(require("./file.js?a"));
});
