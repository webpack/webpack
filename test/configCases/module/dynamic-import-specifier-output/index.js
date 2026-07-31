import { shared } from "./shared.js";

it("should emit literal relative specifiers, not public path concatenation", async () => {
	const a = await import("./a.js");
	expect(a.default + shared()).toBe(21);

	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const source = fs.readFileSync(path.join(__dirname, "bundle0.mjs"), "utf-8");
	// statically analysable: the specifier is a literal, not built at runtime
	expect(source).toMatch(/import\(\s*(?:\/\*[^*]*\*\/\s*)?"\.\//);
	expect(source).not.toMatch(/__webpack_require__\.p\s*\+/);
});
