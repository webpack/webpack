import { FLAG } from "./a.js";

const fs = __non_webpack_require__("fs");

const generated = /** @type {string} */ (fs.readFileSync(__filename, "utf-8"));

it("should still inline a const export across a side-effect-only cycle", () => {
	// START:side-effect-cycle
	expect(FLAG).toBe(42);
	// END:side-effect-cycle
	const block = generated.match(
		/\/\/ START:side-effect-cycle([\s\S]*)\/\/ END:side-effect-cycle/
	)[1];
	expect(block.includes(`(/* inlined export .FLAG */42)`)).toBe(true);
});
