it("should replace Object.defineProperty correctly with brakets", () => {
	expect(require("./module").test).toBe(true);
});
