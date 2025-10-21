"use strict";

const { resolve } = require("../lib/config/browserslistTargetHandler");

describe("browserslist target", () => {
	const tests = [
		// IE
		["ie 11"],
		["ie_mob 11"],

		// Edge
		["edge 79"],

		// Android
		["android 4"],
		["android 4.1"],
		["android 4.4.3-4.4.4"],
		["android 81"],

		// Chrome
		// Browserslist return `chrome` versions for `electron 11.0` query
		["chrome 80"],
		["and_chr 80"],

		// Firefox
		["firefox 68"],
		["and_ff 68"],

		// Opera
		["opera 54"],
		["op_mob 54"],

		// Safari
		// Browserslist return `safari` versions for `phantomjs 2.1` query
		["safari 10"],
		["safari TP"],
		["safari 11"],
		["safari 12.0"],
		["safari 12.1"],
		["safari 13"],
		["ios_saf 12.0-12.1"],

		// Samsung
		["samsung 4"],
		["samsung 9.2"],
		["samsung 11.1-11.2"],

		// Opera mini
		["op_mini all"],

		// BlackBerry
		["bb 10"],

		// Node
		["node 0.10.0"],
		["node 0.12.0"],
		["node 10.0.0"],
		["node 10.17.0"],
		["node 12.19.0"],
		["node 13.12.0"],
		["node 24.7.0"],

		// QQ browser
		["and_qq 10.4"],

		// Kaios
		["kaios 2.5"],

		// Baidu
		["baidu 7.12"],

		// Multiple
		["firefox 80", "chrome 80"],
		["chrome 80", "node 12.19.0"],
		["chrome 80", "node 13.12.0"],

		// defaults and fully supports es6-module
		// maintained node versions
		[
			"and_chr 140",
			"and_ff 142",
			"and_qq 14.9",
			"and_uc 15.5",
			"android 140",
			"chrome 140",
			"chrome 139",
			"chrome 138",
			"chrome 137",
			"chrome 112",
			"chrome 109",
			"chrome 105",
			"edge 140",
			"edge 139",
			"edge 138",
			"firefox 143",
			"firefox 142",
			"firefox 141",
			"firefox 140",
			"ios_saf 26.0",
			"ios_saf 18.5-18.6",
			"kaios 3.0-3.1",
			"node 24.8.0",
			"node 22.19.0",
			"node 20.19.0",
			"op_mob 80",
			"opera 122",
			"opera 121",
			"opera 120",
			"safari 26.0",
			"safari 18.5-18.6",
			"samsung 28",
			"samsung 27"
		],

		// Unknown
		["unknown 50"]
	];

	for (const test of tests) {
		it(`${JSON.stringify(test)}`, () => {
			expect(resolve(test)).toMatchSnapshot();
		});
	}
});
