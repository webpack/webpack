it("successfully loads a file that gets its only loader from a plugins beforeLoaders hook", function() {
	expect(require("./a")).toBe("success");
});
