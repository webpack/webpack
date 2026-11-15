export * from "./a";
import fs from "fs";
import path from "path";

const generated = /** @type {string} */ (fs.readFileSync(__filename, "utf-8"));

it("should render inlined re-exported const as a literal in the library surface", () => {
	expect(generated).not.toMatch(/\{"value":\{"kind":/);
	expect(generated).toMatch(
		/const __webpack_exports__b = \(\/\* inlined export \.b \*\/"1"\);/
	);
	expect(generated).toMatch(/export \{[^}]*\b__webpack_exports__b as b\b/);
});
