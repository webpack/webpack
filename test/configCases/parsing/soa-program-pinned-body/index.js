"use strict";

const { value } = require("./module");

it("should walk modules through the pinned-body fallback", () => {
	expect(value).toBe(42);
});
