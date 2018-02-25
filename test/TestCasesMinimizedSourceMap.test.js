const { describeCases } = require("./TestCases.template");
const Stats = require("../lib/Stats");
const webpack = require("../lib/webpack");

describe("TestCases", () => {
	describeCases({
		name: "minimized-source-map",
		mode: "production",
		devtool: "eval-cheap-module-source-map",
		minimize: true
	});
});
