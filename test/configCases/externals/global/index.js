afterEach(done => {
	delete global.EXTERNAL_TEST_GLOBAL;
	done();
});

it("should move externals in chunks into entry chunk", function() {
	global.EXTERNAL_TEST_GLOBAL = 42;
	// eslint-disable-next-line node/no-missing-require
	const result = require("external");
	expect(result).toBe(42);
});
