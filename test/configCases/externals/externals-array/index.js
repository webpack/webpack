it("should not fail on optional externals", function() {
	const external = require("external");
	expect(external).toBe(EXPECTED);
});
