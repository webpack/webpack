it("should not fail on optional externals", function() {	
	if (NODE_MAJOR_VERSION <= 12) {
		const external = require("external");
		// The behavior of jest mock's require is different from that of node require, so it works fine here.
		expect(external).toBe(EXPECTED);
	} else {
		try {
			require("external");
		} catch (e) {
			// Since there is no webpack in node_modules, node require will report an error here.
			expect(e.message).toContain("Cannot find module 'webpack'");
		}
	}
});
