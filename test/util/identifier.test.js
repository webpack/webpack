/* globals describe, beforeEach, it */
"use strict";

const should = require("should");
const path = require("path");

const identifierUtil = require("../../lib/util/identifier");

describe("pathUtil", () => {
	describe("makeRelative", () => {
		describe("given a context and a pathConstruct", () => {
			let context, pathConstruct, expected;
			beforeEach(() => {
				context = "/some/dir/";
				pathConstruct = "/some/dir/to/somwhere|some/other/dir!../more/dir";
				expected = `${path.relative(context, "/some/dir/to/somwhere")}|${path.relative(context, "some/other/dir")}!${path.relative(context, "../more/dir")}`;
			});

			it("computes the correct relative results for the path construct", () => {
				should(identifierUtil.makePathsRelative(context, pathConstruct)).be.exactly(expected);
			});
		});
	});
});
