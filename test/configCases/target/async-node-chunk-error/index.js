it("should reject import() when a chunk fails to evaluate", async () => {
	await expect(
		import(/* webpackChunkName: "broken" */ "./chunk")
	).rejects.toThrow(SyntaxError);
});
