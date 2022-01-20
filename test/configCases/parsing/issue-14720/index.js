it("should generate a chunk for a full require dependencies in require.ensure", done => {
	require.ensure([], () => {
		expect(require("./module").property).toBe(42);
		expect(__STATS__.chunks.length).toBe(2);
		done();
	});
});
