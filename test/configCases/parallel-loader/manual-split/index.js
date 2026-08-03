it("should only parallelize the loaders after a hand-placed parallel loader", () => {
	expect(require("./a")).toBe("wm");
});
