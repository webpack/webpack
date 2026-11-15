"use strict";

it("should not define variables when a replacement pattern grows past the limit", () => {
	expect(process.env.WEBPACK_G).toBe(undefined);
});
