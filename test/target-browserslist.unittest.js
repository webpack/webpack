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

		// UC browsers for Android
		["and_uc 12.12"],

		// QQ browser
		["and_qq 10.4"],

		// Kaios
		["kaios 2.5"],

		// Baidu
		["baidu 7.12"],

		// Multiple
		["firefox 80", "chrome 80"],
		["chrome 80", "node 12.19.0"],

		// Unknown
		["unknown 50"]
	];

	for (const test of tests) {
		it(`${JSON.stringify(test)}`, () => {
			expect(resolve(test)).toMatchSnapshot();
		});
	}
});
