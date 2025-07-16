/** @type {import("../../../").Configuration} */
module.exports = {
	entry: "./index.js",
	target: ["web", "node"],
	mode: "production",
	experiments: {
		outputModule: true
	},
	output: {
		module: true
	}
};
