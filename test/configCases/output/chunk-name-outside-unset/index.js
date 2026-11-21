it("should load a chunk whose name leads outside of output.path", async () => {
	const { default: value } = await import(
		/* webpackChunkName: "../chunk-name-outside-unset-sibling/lazy" */ "./lazy"
	);
	expect(value).toBe("lazy");
});
