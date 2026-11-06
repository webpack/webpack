"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		copy: [
			{ from: "images/*.png", to: "out" },
			{
				from: "images/*.png",
				to: "hashed",
				filename: "[name]-[contenthash:8][ext]"
			}
		]
	}
};
