"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		concatenateModules: false
	},
	experiments: {
		lazyBarrel: true
	}
};
