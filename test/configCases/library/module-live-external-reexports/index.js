import * as library from "./library.mjs";

it("should keep direct external reexports live after mutation", () => {
	const before = library.counter;
	library.increment();
	expect(library.counter).toBe(before + 1);
});

it("should keep renamed external reexports live after mutation", () => {
	const before = library.renamed;
	library.increment();
	expect(library.renamed).toBe(before + 1);
});

it("should keep external reexports through a barrel live after mutation", () => {
	const before = library.indirect;
	library.increment();
	expect(library.indirect).toBe(before + 1);
});

it("should keep default external reexports live after mutation", () => {
	const before = library.default;
	library.increment();
	expect(library.default).toBe(before + 1);
});
