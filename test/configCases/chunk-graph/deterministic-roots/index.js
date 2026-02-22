it("should produce deterministic output with cyclic dependencies", async () => {
	import("./a").then(({ getCombined }) => {
		const result = getCombined();
		expect(result).toBe("abcaca")
	});
});
