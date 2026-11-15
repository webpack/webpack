"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [false, true].map((concatenateModules) => ({
	mode: "production",
	optimization: { minimize: false, concatenateModules }
}));
