"use strict";

it("should report a custom parser's AST without source offsets", () => {
	expect(() => require("./module.js")).toThrow(/no source offsets/);
});
