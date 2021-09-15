/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {import("../../../../").Compilation} Compilation */
/** @typedef {import("../../../../").Configuration} Configuration */

/** @type {Configuration} */
/** @type {import("../../../../").Configuration} */
module.exports = {
	entry() {
		return Promise.resolve({
			app: { import: "./app.js", dependOn: ["other-vendors"] },
			page1: { import: "./page1.js", dependOn: ["app"] },
			"other-vendors": "./other-vendors"
		});
	},
	target: "web",
	output: {
		filename: "[name].js"
	}
};
