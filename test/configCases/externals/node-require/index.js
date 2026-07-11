it("should not fail on optional externals", function() {
	try {
		require("external");
	} catch (e) {
		// Since there is no webpack in node_modules, node require will report an error here.
		expect(e.message).toContain("Cannot find module 'webpack'");
	}
});
