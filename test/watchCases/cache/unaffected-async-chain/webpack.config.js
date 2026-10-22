"use strict";

/** @type {import("../../../..").Configuration} */
module.exports = {
	mode: "development",
	cache: { type: "memory" },
	optimization: { concatenateModules: false, usedExports: false }
};
