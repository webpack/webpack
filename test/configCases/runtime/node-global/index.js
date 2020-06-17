"use strict";

it("should be able to use global if `node.global` is set to `true`", function() {
	expect((typeof global)).toBe("object");
	expect((global === null)).toBe(false)
});
