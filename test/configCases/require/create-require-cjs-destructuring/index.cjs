"use strict";

const { createRequire } = require("module");
const { createRequire: createRequireNode } = require("node:module");

const require1 = createRequire(__filename);
const require2 = createRequireNode(__filename);

it("should handle createRequire destructured from require('module')", () => {
	expect(require1("./a.cjs")).toBe(1);
	expect(require2("./a.cjs")).toBe(1);
});

it("should resolve using createRequire destructured from require", () => {
	expect(require1.resolve("./a.cjs")).toBe("./a.cjs");
	expect(require2.resolve("./a.cjs")).toBe("./a.cjs");
});
