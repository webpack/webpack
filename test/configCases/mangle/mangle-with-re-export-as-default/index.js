import namespace from "./re-exports";

it("should mangle exports imported", () => {
	const { foo } = namespace;
	expect(foo).toBe('foo')
});
