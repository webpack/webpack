import external3Default, { namedThing } from "external3";
import "external4";

/* This test verifies that webpack externals are properly indicated as dependencies to System.
 * Also that when System provides the external variables to webpack that the variables get plumbed
 * through correctly and are usable by the webpack bundle.
 */
it("should get an external from System", function () {
	const external1 = require("external1");
	expect(external1.default).toBe("the external1 value");

	const external2 = require("external2");
	expect(external2.default).toBe("the external2 value");

	expect(external3Default).toBe("the external3 default export");
	expect(namedThing).toBe("the external3 named export");

	const external5 = require("./reexport-external.js");
	expect(external5.default).toBe("the external5 default export");
	expect(external5.namedThing).toBe("the external5 named export");
});
