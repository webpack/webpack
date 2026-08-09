it("should keep a module still reached by an active require edge", () => {
	const m = require("./lib");
	expect(m.used).toBe("used");
	expect(m.usedExports).toEqual(["used", "usedExports"]);
	// Live edge elsewhere keeps heavy even though unusedMethod's require is inactive.
	expect(require("./heavy")).toBe("heavy");
	expect(require.resolveWeak("./heavy")).not.toBe(null);
});
