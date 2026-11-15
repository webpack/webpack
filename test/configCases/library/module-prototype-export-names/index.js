import * as library from "./library.mjs";

it("should export names found on Object.prototype", () => {
	expect(library.constructor).toBe(1);
	expect(library.valueOf).toBe(2);
	expect(library["__proto__"]).toBe(3);
	expect(Object.keys(library)).toEqual(
		expect.arrayContaining([
			"__proto__",
			"constructor",
			"inc",
			"toString",
			"valueOf"
		])
	);
});

it("should keep a live binding named toString", () => {
	expect(library.toString).toBe(1);
	library.inc();
	expect(library.toString).toBe(2);
});
