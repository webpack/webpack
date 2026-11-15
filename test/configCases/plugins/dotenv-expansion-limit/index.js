"use strict";

it("should not define variables when expansion grows past the limit", () => {
	expect(process.env.WEBPACK_V30).toBe(undefined);
	expect(process.env.WEBPACK_SMALL).toBe(undefined);
});
