/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		a: "./index.js?1",
		A: "./index.js?2"
	},
	output: {
		filename: "[name].js"
	}
};
