/* globals describe, beforeEach, it */
"use strict";

const should = require("should");
const path = require("path");

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
				should(identifierUtil.makePathsRelative(context, pathConstruct)).be.exactly(expected);
			});
		});
	});
});
