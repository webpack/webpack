const { resolve } = require("../lib/config/browserslistTargetHandler");

describe("browserslist target", () => {
	const tests = [
		["ie 11"],
		["chrome 80"],
		["chrome 80.0"],
		["CHROME 80"],
		["CHROME 80.0"],
		["node 6"],
		["node 6.0"],
		["node 6.0.0"],
		["firefox 80 ", "chrome 80"]
	];

	for (const test of tests) {
		it(`${JSON.stringify(test)}`, () => {
			expect(resolve(test)).toMatchSnapshot();
		});
	}
});
