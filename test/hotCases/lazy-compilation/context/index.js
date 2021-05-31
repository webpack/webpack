it("should compile to lazy imported context", done => {
	const req = require.context("./modules", /^\.\/.*\.js$/);
	const result = req("./demo");

	expect(result).toBe(42);

	done();
});
