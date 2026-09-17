import external3Default, { namedThing } from "external3";
import "external4";

/* Verifies that webpack externals are indicated as dependencies to System, and
 * that the variables System provides are plumbed through and usable by the bundle.
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
