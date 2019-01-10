"use strict";

const webpack = require("../../../../");

module.exports = {
	plugins: [new webpack.optimize.ModuleConcatenationPlugin()]
};
