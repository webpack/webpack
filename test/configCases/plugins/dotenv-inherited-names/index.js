"use strict";

it("should expand names inherited from Object.prototype as unset variables", () => {
	expect(process.env.WEBPACK_BRACED).toBe("ab");
	expect(process.env.WEBPACK_PLAIN).toBe("a.b");
	expect(process.env.WEBPACK_PROTO).toBe("ab");
	expect(process.env.WEBPACK_DEFAULT).toBe("fallback");
	expect(process.env.WEBPACK_ALTERNATE).toBe("x");
});

it("should still expand variables that are set", () => {
	expect(process.env.WEBPACK_REFERENCE).toBe("value-value");
});
