"use strict";

var NoEmitOnErrorsPlugin = require("../../../").NoEmitOnErrorsPlugin;
var TestChildCompilationFailurePlugin = require("./TestChildCompilationFailurePlugin");

/** @type {import("../../../").Configuration} */
module.exports = {
	entry: "./index",
	output: {
		filename: "bundle.js"
	},
	plugins: [
		new NoEmitOnErrorsPlugin(),
		new TestChildCompilationFailurePlugin({
			filename: "child.js"
		})
	]
};
