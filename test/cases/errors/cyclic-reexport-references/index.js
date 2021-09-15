it("should fail with a ReferenceError", () => {
	expect(() => {
		require("./cycle");
	}).toThrow();
});
