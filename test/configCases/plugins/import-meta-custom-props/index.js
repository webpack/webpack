it("should replace custom import.meta properties on direct access", () => {
	expect(import.meta.custom).toBe("custom-value");
	expect(import.meta.build.time).toBe("now");
});

it("should expose custom properties on the import.meta object", () => {
	const meta = import.meta;
	expect(meta.custom).toBe("custom-value");
	expect(meta.build.time).toBe("now");
});

it("should expose custom properties when destructuring import.meta", () => {
	const { custom, build } = import.meta;
	expect(custom).toBe("custom-value");
	expect(build.time).toBe("now");
});

it("should keep unknown properties undefined", () => {
	expect(import.meta.unknownProp).toBeUndefined();
	const { unknownProp } = import.meta;
	expect(unknownProp).toBeUndefined();
});
