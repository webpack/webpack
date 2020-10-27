it("should allow circular dependencies between containers (parallel)", async () => {
	const [
		{ default: value1, b, ba },
		{ default: value2, a, ab }
	] = await Promise.all([import("container/a"), import("container2/b")]);
	expect(value1).toBe("a");
	expect(b).toBe("b");
	expect(ba).toBe("a");
	expect(value2).toBe("b");
	expect(a).toBe("a");
	expect(ab).toBe("b");
});
