const { describeCases } = require("./TestCases.template");
const Stats = require("../lib/Stats");
const webpack = require("../lib/webpack");

describe("TestCases", () => {
	describeCases({
		name: "devtool-cheap-eval-module-source-map",
		devtool: "cheap-eval-module-source-map"
	});
});
