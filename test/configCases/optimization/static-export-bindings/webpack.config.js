"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		concatenateModules: false,
		mangleExports: false,
		usedExports: false
	}
};
