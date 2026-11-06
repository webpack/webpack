"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [true, false].map((mangleExports) => ({
	mode: "production",
	optimization: {
		minimize: false,
		mangleExports
	}
}));
