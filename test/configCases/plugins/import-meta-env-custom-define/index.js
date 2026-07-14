globalThis.CUSTOM_META_ENV = { A: "a" };

it("should defer whole-object reads to a custom definition", () => {
	const env = import.meta.env;
	expect(env.A).toBe("a");
});

it("should resolve unknown properties on the custom definition at runtime", () => {
	expect(import.meta.env.A).toBe("a");
});

it("should still replace dotted definitions on direct access", () => {
	expect(import.meta.env.B).toBe("b");
});
