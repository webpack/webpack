const { resolve } = require("../lib/config/browserslistTargetHandler");

describe("browserslist target", () => {
	const tests = [
		["ie 11"],
		["chrome 80"],
		["node 0.10.0"],
		["node 0.12.0"],
		["node 10.0.0"],
		["node 10.17.0"],
		["node 12.19.0"],
		["safari 10"],
		["safari TP"],
		["safari 11"],
		["safari 12.0"],
		["safari 12.1"],
		["safari 13"],
		["firefox 80", "chrome 80"],
		["chrome 80", "node 12.19.0"]
	];

	for (const test of tests) {
		it(`${JSON.stringify(test)}`, () => {
			expect(resolve(test)).toMatchSnapshot();
		});
	}
});
