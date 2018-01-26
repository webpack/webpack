import d from "library";
import { a, b, external } from "library";

it("should be able to import hamorny exports from library (" + NAME + ")", function() {
	expect(d).toBe("default-value");
	expect(a).toBe("a");
	expect(b).toBe("b");
	if(typeof TEST_EXTERNAL !== "undefined" && TEST_EXTERNAL) {
		expect(external).toEqual(["external"]);
		external.should.be.equal(require("external"));
	} else {
		expect(external).toBe("non-external");
	}
});
