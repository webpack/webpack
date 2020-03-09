const webpack = require("../");

describe("Cli", () => {
	it("should generate the correct cli flags", () => {
		expect(webpack.cli.getFlags()).toMatchSnapshot();
	});
});
