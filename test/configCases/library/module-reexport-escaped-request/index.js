import * as library from "./library.mjs";

it("should preserve escaped external requests in native star reexports", () => {
	expect(library.quoted).toBe(1);
	expect(library.backslash).toBe(2);
	expect(library.newline).toBe(3);
	expect(library.separator).toBe(4);
	expect(library.paragraph).toBe(5);
	expect(library.plain).toBe(6);
});

it("should escape line separators in emitted module specifiers", () => {
	const fs = __non_webpack_require__("fs");
	const source = fs.readFileSync(
		__filename.replace(/main(\d+)\.mjs$/, "library$1.mjs"),
		"utf-8"
	);
	expect(source).toMatch(/import\s*\*\s*as\s+\S+\s*from\s*"separator\\u2028module"/);
	expect(source).toMatch(/import\s*\*\s*as\s+\S+\s*from\s*"paragraph\\u2029module"/);
	expect(source).toMatch(/export\s*\*\s*from\s*"separator\\u2028module"/);
	expect(source).toMatch(/export\s*\*\s*from\s*"paragraph\\u2029module"/);
});
