it("should warn on path traversal in webpackChunkName from node_modules", () => {
	require("malicious-dep");
});
