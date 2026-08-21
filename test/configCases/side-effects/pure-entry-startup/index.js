const fs = require("fs");
const path = require("path");

const read = (name) =>
	fs.readFileSync(path.join(path.dirname(__filename), name), "utf-8");

const libraries = ["bundle0.mjs", "bundle1.mjs", "bundle2.js"];

it("should annotate the entry a bootstrapped runtime starts", () => {
	expect(read("bundle0.mjs")).toMatch(
		/__webpack_exports__ = \/\*#__PURE__\*\/__webpack_require__\(/
	);
});

it("should annotate the entry an ESM chunk starts", () => {
	expect(read("bundle1.mjs")).toMatch(
		/__webpack_exports__ = \/\*#__PURE__\*\/__webpack_exec__\(/
	);
});

it("should annotate the entry a CommonJS chunk starts", () => {
	expect(read("bundle2.js")).toMatch(
		/__webpack_exports__ = \(\/\*#__PURE__\*\/__webpack_exec__\(/
	);
});

it("should keep the annotated module in every library", () => {
	for (const name of libraries) {
		expect(read(name)).toContain("a * b");
	}
});
