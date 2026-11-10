import * as library from "./library.mjs";

it("should preserve sequence initializer values and side effects", () => {
	expect(library.calls).toEqual(["first", "second"]);
	expect(library.value).toBe(42);
	expect(library.zero).toBe(0);
	expect(library.callback()).toBe(42);
	expect(library.callback.name).toBe("");
	expect(library.read()).toEqual([42, 0, 42]);
});

it("should keep sequence-initialized exports live", () => {
	library.bump();
	expect(library.value).toBe(43);
	expect(library.zero).toBe(1);
	expect(library.callback()).toBe(86);
	expect(library.read()).toEqual([43, 1, 86]);
	expect(library.calls).toEqual(["first", "second"]);
});
