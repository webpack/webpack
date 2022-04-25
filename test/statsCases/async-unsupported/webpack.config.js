/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	target: ["web", "es5"],
	entry: "./index",
	experiments: {
		topLevelAwait: true
	},
	externals: {
		aaa: "promise Promise.resolve()"
	},
	stats: {
		preset: "all",
		errorDetails: true
	}
};
