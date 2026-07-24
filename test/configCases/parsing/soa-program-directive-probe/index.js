"use strict";

it("should probe every top-level directive shape on the columns", () => {
	expect(require("./call-first")).toBe(1);
	expect(require("./literal-first")).toBe(2);
	expect(require("./tagged-first")).toBe(3);
	expect(Object.keys(require("./empty"))).toHaveLength(0);
	expect(require("./var-first")).toBe(4);
});
