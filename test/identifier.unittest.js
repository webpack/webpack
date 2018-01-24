/* globals describe, beforeEach, it */
"use strict";

const identifierUtil = require("../lib/util/identifier");

describe("util/identifier", () => {
	describe("makePathsRelative", () => {
		describe("given a context and a pathConstruct", () => {
			let context, pathConstruct, expected;
			beforeEach(() => {
				context = "/some/dir/";
				pathConstruct = "/some/dir/to/somwhere|some/other/dir!../more/dir";
				expected = "to/somwhere|some/other/dir!../more/dir";
			});

			it("computes the correct relative results for the path construct", () => {
				expect(identifierUtil.makePathsRelative(context, pathConstruct)).toBe(expected);
			});
		});
	});
});
