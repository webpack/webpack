"use strict";

const webpack = require("..");
const { describeCases } = require("./templates/TestCases");

describe("TestCases", () => {
	describeCases({
		name: "hot",
		plugins: [new webpack.HotModuleReplacementPlugin()]
	});
});
