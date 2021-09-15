it("should compile a long module chain fine", () => {
	require.resolveWeak("./module?800"); // this is orphan
});
