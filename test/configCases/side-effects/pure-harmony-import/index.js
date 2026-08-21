import { mul } from "./pure-esm";
import { div } from "./impure-esm";

it("should compute", () => {
	expect(mul(6, 7)).toBe(42);
	expect(div(84, 2)).toBe(42);
});

it("should annotate the import of a side-effect-free module", () => {
	const fs = require("fs");
	const source = fs.readFileSync(__filename, "utf-8");
	expect(source).toMatch(
		/harmony import \*\/ var _pure_esm__WEBPACK_IMPORTED_MODULE_\d+__ = \/\*#__PURE__\*\/__webpack_require__\(/
	);
	expect(source).toMatch(
		/harmony import \*\/ var _impure_esm__WEBPACK_IMPORTED_MODULE_\d+__ = __webpack_require__\(/
	);
});
