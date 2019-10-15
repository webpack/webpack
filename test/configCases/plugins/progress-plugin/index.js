it("should contain the custom progress messages", function() {
	var data = require("data");
	expect(data).toContain("optimizing");
	expect(data).toContain("optimizing|CustomPlugin");
	expect(data).toContain(
		"optimizing|CustomPlugin|custom category|custom message"
	);
});
