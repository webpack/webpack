"use strict";

const path = require("node:path");

// The common sass setup registers one loader chain for `.sass`, `.scss` AND `.css`.
// Because that rule matches `.css`, the "auto" default must keep the built-in CSS
// type off so the chain keeps handling `.css` (no double-processing / breakage).
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	module: {
		rules: [
			{
				test: /\.(sa|sc|c)ss$/i,
				use: [path.resolve(__dirname, "loader.js")]
			}
		]
	}
};
