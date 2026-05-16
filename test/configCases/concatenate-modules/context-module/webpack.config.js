/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./index.mjs",
	output: { iife: false },
	optimization: { concatenateModules: true }
};
