it("should not fail on AMD externals", function() {
	const external = require("external");
	expect(external).toBe(EXPECTED);
});
