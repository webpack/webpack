import { mul } from "./pure";
import { div } from "./impure";

it("should compute", () => {
	expect(mul(6, 7)).toBe(42);
	expect(div(84, 2)).toBe(42);
});

it("should annotate the instantiation of a side-effect-free module", () => {
	const fs = require("fs");
	const source = fs.readFileSync(__filename, "utf-8");
	expect(source).toMatch(
		/EXTERNAL MODULE: \.\/pure\.js\nvar \w+ = \/\*#__PURE__\*\/__webpack_require__\(/
	);
	expect(source).toMatch(
		/EXTERNAL MODULE: \.\/impure\.js\nvar \w+ = __webpack_require__\(/
	);
});
