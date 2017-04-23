import expect from 'jest-matchers';

it("should also work in a chunk", function(done) {
	require.ensure([], function(require) {
		var contextRequire = require.context(".", false, /two/);
		expect(contextRequire("./two")).toEqual(2);
		var tw = "tw";
		expect(require("." + "/" + tw + "o")).toEqual(2);
		done();
	});
});

