"use strict";

it("reads a file: url inside resolve.restrictions", () => {
	expect(require(INSIDE_URL).trim()).toBe("inside");
});
