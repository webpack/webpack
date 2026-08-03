it("should fail the build when a worker loader uses an unavailable API", () => {
	expect(() => require("./a")).toThrow();
});
