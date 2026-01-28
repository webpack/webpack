"use strict";

const { HotModuleReplacementPlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: false,
	optimization: { usedExports: false, sideEffects: false },
	plugins: [new HotModuleReplacementPlugin()]
};
