const { resolve } = require("../lib/config/browserslistTargetHandler");

describe("browserslist target", () => {
	const tests = [
		// IE
		["ie 11"],

		// Edge
		["edge 79"],

		// Android
		["android 4"],
		["android 4.1"],
		// TODO fix
		// ["android 4.4.3-4.4.4"],

		// Chrome
		["chrome 80"],
		["and_chr 80"],

		// Firefox
		["firefox 68"],
		["and_ff 68"],

		// Opera
		["opera 54"],
		["op_mob 54"],

		// Safari
		["safari 10"],
		["safari TP"],
		["safari 11"],
		["safari 12.0"],
		["safari 12.1"],
		["safari 13"],

		// Samsung
		["samsung 4"],
		["samsung 9.2"],
		// TODO ["samsung 11.1-11.2"]

		// TODO Electron
		// TODO ie_mob
		// TODO Baidu
		// TODO bb
		// TODO op_mini
		// TODO and_uc
		// TODO and_qq
		// TODO kaios
		// TODO unknown for future new browsers

		// Node
		["node 0.10.0"],
		["node 0.12.0"],
		["node 10.0.0"],
		["node 10.17.0"],
		["node 12.19.0"],

		// Multiple
		["firefox 80", "chrome 80"],
		["chrome 80", "node 12.19.0"]
	];

	for (const test of tests) {
		it(`${JSON.stringify(test)}`, () => {
			expect(resolve(test)).toMatchSnapshot();
		});
	}
});
