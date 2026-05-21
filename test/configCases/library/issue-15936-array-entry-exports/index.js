it("should expose exports from all array entry modules", () => {
	expect(globalThis.a).toBe("a");
	expect(globalThis.b).toBe("b");
	expect(globalThis.c).toBe("c");
});
