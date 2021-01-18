afterEach(done => {
	(function() { delete this.EXTERNAL_TEST_GLOBAL; })();
	done();
});

it("should import an external value assigned to global this", function() {
	(function() { this.EXTERNAL_TEST_GLOBAL = 42; })();
	// eslint-disable-next-line node/no-missing-require
	const result = require("external");
	expect(result).toBe(42);
});
