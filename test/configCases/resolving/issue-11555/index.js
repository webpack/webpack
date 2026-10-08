it("should be possible to use # in folders", () => {
	const eIndexOf = require("es5-ext/array/#/e-index-of");
	expect(eIndexOf).toBeTypeOf("function");
});

it("should be possible to use # in folders (context)", () => {
	const x = "e-index-of";
	const eIndexOf = require(`es5-ext/array/#/${x}`);
	expect(eIndexOf).toBeTypeOf("function");
});

it("should be possible to use # in folders (context)", () => {
	const array = require("es5-ext/array");
	expect(array).toMatchObject({
		"#": expect.objectContaining({
			clear: expect.toBeTypeOf("function")
		})
	});
});

it("should be possible escape # in requests", () => {
	const eIndexOf = require("es5-ext/array/\0#/e-index-of#fragment");
	expect(eIndexOf).toBeTypeOf("function");
});

it("should be possible dynamically import # in folders", async () => {
	const eIndexOf = await import("es5-ext/array/#/first");
	expect(eIndexOf.default).toBeTypeOf("function");
});
