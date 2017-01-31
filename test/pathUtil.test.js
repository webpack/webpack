/* globals describe, beforeEach, afterEach, it */
"use strict";

const should = require("should");
const sinon = require("sinon");
const path = require("path");

const pathUtil = require("../lib/pathUtil");
const memoizedResolveRelative = pathUtil.memoizedResolveRelative;
const makeRelative = pathUtil.makeRelative;

describe("pathUtil", () => {
	describe("memoizedResolveRelative", () => {
		let pathA, pathB, pathRelativeStub;
		beforeEach(() => {
			pathA = "/some/dir/to/somewhere";
			pathB = "/some/dir/to/somewhere/else";
			pathRelativeStub = sinon.stub(path, "relative").returns("foobar");
		});

		afterEach(() => {
			path.relative.restore();
		});

		it("computes the same result as path.relative", () => {
			should(path.relative(pathA, pathB)).be.exactly(memoizedResolveRelative(pathA, pathB));
		});

		it("memoizes the result and does not call the underlying relative resolver", () => {
			let resultA = memoizedResolveRelative(pathB, pathA);
			let resultB = memoizedResolveRelative(pathB, pathA);
			should(resultA).be.exactly(resultB);
			should(pathRelativeStub.callCount).be.exactly(1);
		});
	});

	describe("makeRelative", () => {
		describe("given a context and a pathConstruct", () => {
			let context, pathConstruct, expected;
			beforeEach(() => {
				context = "/some/dir/";
				pathConstruct = "/some/dir/to/somwhere|some/other/dir!../more/dir";
				expected = `${path.relative(context, "/some/dir/to/somwhere")}|${path.relative(context, "some/other/dir")}!${path.relative(context, "../more/dir")}`;
			});

			it("computes the correct relative results for the path construct", () => {
				should(makeRelative(context, pathConstruct)).be.exactly(expected);
			});
		});

		describe("calling the with the same arguments", () => {
			let context, pathConstruct, expected, memoizedResolveRelativeStub;
			beforeEach(() => {
				context = "/some-other/dir/";
				pathConstruct = "/some-other/dir/to/somwhere|some-other/other/dir!../more/dir";
				expected = "foo|foo!foo";
				memoizedResolveRelativeStub = sinon.stub(pathUtil, "memoizedResolveRelative").returns("foo");
			});

			afterEach(() => {
				pathUtil.memoizedResolveRelative.restore();
			});

			it("memoize the results of previous calls", () => {
				let actualA = makeRelative(context, pathConstruct);
				let actualB = makeRelative(context, pathConstruct);
				should(actualA).be.exactly(actualB);
				should(actualA).be.exactly(expected);
				should(memoizedResolveRelativeStub.callCount).be.exactly(3);
			});
		});
	});
});
