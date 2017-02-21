"use strict";
it("should fail when a loader is called twice", () => {
	try {
		// eslint-disable-next-line node/no-unpublished-require, node/no-missing-require
		require("some-loader!./a");
		"It reached here".should.be.exact("but didn't have to");
	} catch(error) {
		error.message.should.be.exact("hey, you're applying a loader multiple times, don't do that man!");
	}
});

it("should fail when two identical loaders are called with different queries", () => {
	try {
		// eslint-disable-next-line node/no-unpublished-require, node/no-missing-require
		require("json-loader?foo=someMessage!./b");
		"It reached here".should.be.exact("but didn't have to");
	} catch(error) {
		error.message.should.be.exact("hey, you're applying a loader multiple times, don't do that man!");
	}
});

it("should should fail when loader default config is an object but then is called with a query string", () => {
	try {
		// eslint-disable-next-line node/no-unpublished-require, node/no-missing-require
		require("any-loader?foo=someMessage!./c");
		"It reached here".should.be.exact("but didn't have to");
	} catch(error) {
		error.message.should.be.exact("hey, you're applying a loader multiple times, don't do that man!");
	}
});
