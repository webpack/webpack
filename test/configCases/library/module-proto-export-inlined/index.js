import * as library from "./library.mjs";

it("should export a binding named __proto__ from an inlined entry", () => {
	expect(Object.prototype.hasOwnProperty.call(library, "__proto__")).toBe(true);
	expect(library["__proto__"]).toEqual({ flag: true });
	expect(library.other).toBe(1);
});
