"use strict";

const assertCircular = require("../../../helpers/assertCircularModules");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimize: false,
		concatenateModules: false
	},
	plugins: [assertCircular(["a.js", "b.js"])]
};
