import { mul } from "./pure-cjs";

export function times(a, b) {
	return mul(a, b);
}

it("should keep the annotation through minification", () => {
	const fs = require("fs");
	const source = fs.readFileSync(__filename, "utf-8");
	// Spelled out in pieces, so this assertion is not itself a hit.
	const annotation = ["/*#", "__PURE__", "*/"].join("");

	// Terser strips annotations unless the library defaults ask it not to, so the
	// one in front of the side-effect-free module's instantiation must still be here.
	expect(source).toMatch(
		new RegExp(`${annotation.replace(/[*/]/g, "\\$&")}\\w+\\(`)
	);
	expect(times(6, 7)).toBe(42);
});
