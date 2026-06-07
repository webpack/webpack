it("should warn on path traversal in require.ensure chunk name from node_modules", () => {
	require("malicious-dep");
});
