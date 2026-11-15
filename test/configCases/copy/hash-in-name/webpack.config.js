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
			},
			{
				from: "images/logo*.png",
				to: "callback",
				filename: ({ filename }) => filename
			},
			{
				from: "images/photo*.png",
				to: "named",
				filename: ({ chunk }) =>
					`${chunk && chunk.name === "photo#1" ? "original" : "other"}.png`
			}
		]
	}
};
