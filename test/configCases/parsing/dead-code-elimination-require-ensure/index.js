it("should compile and work", done => {
	require.ensure(
		["./foo"],
		() => {
			throw new Error("error");
		},
		() => {
			import("./foo").then(m => {
				expect(m.default).toBe("foo");
				done();
			});
		}
	);
});
