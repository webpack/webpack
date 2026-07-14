it("should still replace direct access via DefinePlugin", () => {
	expect(import.meta.custom).toBe("custom-value");
	expect(import.meta.build.time).toBe("now");
	expect(import.meta.enabledCustom).toBe("enabled-value");
	expect(import.meta.env.A).toBe("a");
	expect(import.meta.env.B).toBe("b");
});

it("should leave whole-object env reads to DefinePlugin when env is disabled", () => {
	const env = import.meta.env;
	expect(env.A).toBe("a");
	expect(env.B).toBe("b");
	const { A, B } = import.meta.env;
	expect(A).toBe("a");
	expect(B).toBe("b");
});

it("should not inject disabled properties into the import.meta object", () => {
	const meta = import.meta;
	expect(meta.enabledCustom).toBe("enabled-value");
	expect(meta.custom).toBeUndefined();
	expect(meta.build).toBeUndefined();
});

it("should preserve disabled properties when destructuring import.meta", () => {
	const { custom, enabledCustom } = import.meta;
	expect(custom).toBeUndefined();
	expect(enabledCustom).toBe("enabled-value");
});

it("should preserve whole reads of disabled nested properties", () => {
	const build = import.meta.build;
	expect(build).toBeUndefined();
});
