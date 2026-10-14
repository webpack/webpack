it("should report an invalid glob on the module that reaches it", () => {
	expect(__STATS__.errors).toHaveLength(1);
});
