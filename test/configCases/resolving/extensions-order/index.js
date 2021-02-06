it("should resolve respecting resolve.extensions order when enforceExtension: true", () => {
	require("./a");
	require("./b")
});
