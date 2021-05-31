// TODO: Why is this giving "No tests exported by test case"?
it("should compile to lazy imported context", done => {
	const req = require.context("./modules", /^\.\/.*\.js$/);
	const result = req("./demo");

	// It's not clear why timeout would be needed now since req is a sync call
	setTimeout(() => {
		expect(result).toBe(42);
		done();
	}, 1000);
});
