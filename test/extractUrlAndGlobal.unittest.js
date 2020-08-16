"use strict";

const extractUrlAndGlobal = require("../lib/util/extractUrlAndGlobal");

describe("extractUrlAndGlobal", () => {
	it("should return jQuery", () => {
		const result = extractUrlAndGlobal(
			"jQuery@https://code.jquery.com/jquery-3.5.1.min.js"
		);
		expect(result).toEqual([
			"https://code.jquery.com/jquery-3.5.1.min.js",
			"jQuery"
		]);
	});
	it("should return _", () => {
		const result = extractUrlAndGlobal(
			"_@https://cdn.jsdelivr.net/npm/lodash@4.17.19/lodash.min.js"
		);
		expect(result).toEqual([
			"https://cdn.jsdelivr.net/npm/lodash@4.17.19/lodash.min.js",
			"_"
		]);
	});
});
