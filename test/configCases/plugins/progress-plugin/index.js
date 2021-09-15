it("should contain the custom progress messages", function () {
	var data = require("data");
	expect(data).toContain("sealing|optimizing");
	expect(data).toContain("sealing|optimizing|CustomPlugin");
	expect(data).toContain(
		"sealing|optimizing|CustomPlugin|custom category|custom message"
	);
});
