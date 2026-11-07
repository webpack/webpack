"use strict";

it("should not define variables when expansion does not finish", () => {
	expect(process.env.WEBPACK_CYCLE).toBe(undefined);
	expect(process.env.WEBPACK_B).toBe(undefined);
});
