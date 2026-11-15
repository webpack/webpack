it("preserves both library entry points", () => {
	expect(require("./first.js")).toBe(42);
	expect(require("./second.js")).toBe(42);
});
