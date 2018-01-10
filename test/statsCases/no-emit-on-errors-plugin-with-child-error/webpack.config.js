"use strict";

var NoEmitOnErrorsPlugin = require("../../../lib/NoEmitOnErrorsPlugin");
var TestChildCompilationFailurePlugin = require("./TestChildCompilationFailurePlugin");

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
