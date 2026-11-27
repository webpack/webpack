"use strict";

const fs = require("fs");
const {
	SHARDS,
	describeAcrossFixtures
} = require("../../helpers/javascriptInvariants");

// Each fixture's own tests run in the `invariants-shard-<n>.unittest.js` its
// name falls in; these read every fixture together.
describeAcrossFixtures();

describe("JavaScript syntax — invariants shards", () => {
	it("has one file for each shard", () => {
		const files = fs
			.readdirSync(__dirname)
			.filter((file) => /^invariants-shard-\d+\.unittest\.js$/.test(file));
		/** @type {string[]} */
		const expected = [];
		for (let shard = 1; shard <= SHARDS; shard++) {
			expected.push(`invariants-shard-${shard}.unittest.js`);
		}
		expect(files.sort()).toEqual(expected.sort());
	});
});
