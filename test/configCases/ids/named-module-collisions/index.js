it("should keep modules whose short and long names collide", () => {
	expect(require("./module.js?a")).toBe("?a");
	expect(require("./module.js?b")).toBe("?b");
	expect(require("./module.js?c")).toBe("?c");
	expect(
		new Set([
			require.resolve("./module.js?a"),
			require.resolve("./module.js?b"),
			require.resolve("./module.js?c")
		]).size
	).toBe(3);
});
