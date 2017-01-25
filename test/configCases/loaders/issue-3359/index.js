"use strict";

// 1. Test some-loader!some-loader
// 3. Test json-loader?query1!json-loader
// 4. Test some-loader?query1!some-loader with query object from webpack.config

it("should fail when a loader is called twice", () => {
	// eslint-disable-next-line node/no-unpublished-require, node/no-missing-require
	require("some-loader!./a");
	// FIXME how I catch this error?
	// error.message.should.be.exact("hey, you're applying a loader multiple times, don't do that man!");
});

it("should fail when two identical loaders are called with different queries", () => {
	// eslint-disable-next-line node/no-unpublished-require, node/no-missing-require
	require("json-loader?foo=someMessage!./b");
});

it("should should fail when loader default config is an object but then is called with a query string", () => {
	// eslint-disable-next-line node/no-unpublished-require, node/no-missing-require
	require("any-loader?bla=bla!./c");
});
