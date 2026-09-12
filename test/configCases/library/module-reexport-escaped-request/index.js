import * as library from "./library.mjs";

it("should preserve escaped external requests in native star reexports", () => {
	expect(library.quoted).toBe(1);
	expect(library.backslash).toBe(2);
	expect(library.newline).toBe(3);
	expect(library.separator).toBe(4);
	expect(library.paragraph).toBe(5);
	expect(library.plain).toBe(6);
});
