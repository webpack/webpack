it("should skip a resolve result the restriction glob does not match", () => {
	expect(require("./value")).toBe("js");
});
