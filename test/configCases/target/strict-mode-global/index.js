"use strict";

it("should be able to use global in strict mode", function() {
	expect((typeof global)).toBe("object");
	expect((global === null)).toBe(false)
});
