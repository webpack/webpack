import * as library from "./library.mjs";

it("should keep external reexports live after mutation", () => {
	expect(library.counter).toBe(0);
	expect(library.renamed).toBe(0);
	expect(library.indirect).toBe(0);
	expect(library.default).toBe(0);
	library.increment();
	expect(library.counter).toBe(1);
	expect(library.renamed).toBe(1);
	expect(library.indirect).toBe(1);
	expect(library.default).toBe(1);
});
