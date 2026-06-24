import literal from "./default-literal.js";
import reference from "./default-reference.js";
import reexported from "./reexport.js";

const fs = __non_webpack_require__("fs");
const generated = /** @type {string} */ (fs.readFileSync(__filename, "utf-8"));

it("should inline default export", () => {
	// START:A
	expect(literal).toBe(42);
	expect(reference).toBe("abc");
	expect(reexported).toBe(42);
	// END:A
	const block = generated.match(/\/\/ START:A([\s\S]*)\/\/ END:A/)[1];
	expect(block.includes('(/* inlined export ["default"] */42)')).toBe(true);
	expect(block.includes('(/* inlined export ["default"] */"abc")')).toBe(
		true
	);
});
