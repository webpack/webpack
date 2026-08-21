import { readLazy } from "./lib.js";

const fs = require("fs");
const path = require("path");

const read = (name) =>
	fs.readFileSync(path.join(path.dirname(__filename), name), "utf-8");

it("should evaluate the deferred module on access", () => {
	expect(readLazy(6, 7)).toBe(43);
});

it("should annotate a deferred import", () => {
	expect(read("bundle0.js")).toMatch(
		/deferred harmony import \*\/ var \w+ = \/\*#__PURE__\*\/__webpack_require__\.zO\(/
	);
});

it("should annotate a deferred module a concatenation reaches", () => {
	expect(read("bundle1.js")).toMatch(
		/DEFERRED EXTERNAL MODULE: \.\/pure-cjs\.js\nvar \w+ = \/\*#__PURE__\*\/__webpack_require__\.zO\(/
	);
});
