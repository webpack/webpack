it("does not crash when a worker exits during importModule", () => {
	expect(() => require("./value")).toThrow();
});
