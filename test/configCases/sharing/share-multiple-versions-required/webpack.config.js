"use strict";

const { SharePlugin } = require("../../../../").sharing;

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new SharePlugin({
			shared: {
				shared: "^1.0.0"
			}
		})
	]
};
