function getMajorVersion(versionStr) {
	const match = versionStr.match(/^v?(\d+)\./);
	if (match) {
	  return parseInt(match[1], 10);
	}
	return null;
}

it("should not fail on optional externals", function() {	
	if (getMajorVersion(NODE_VERSION) <= 12) {
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
