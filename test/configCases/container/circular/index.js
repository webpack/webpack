it("should allow circular dependencies between containers (a)", async () => {
	const { default: value, b, ba } = await import("container/a");
	expect(value).toBe("a");
	expect(b).toBe("b");
	expect(ba).toBe("a");
});

it("should allow circular dependencies between containers (b)", async () => {
	const { default: value, a, ab } = await import("container2/b");
	expect(value).toBe("b");
	expect(a).toBe("a");
	expect(ab).toBe("b");
});
