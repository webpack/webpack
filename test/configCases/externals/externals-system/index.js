/* This test verifies that webpack externals are properly indicated as dependencies to System.
 * Also that when System provides the external variables to webpack that the variables get plumbed
 * through correctly and are usable by the webpack bundle.
 */
it("should get an external from System", function() {
	const external1 = require("external1");
	expect(external1).toBe("the external1 value");

	const external2 = require("external2");
	expect(external2).toBe("the external2 value");
});
