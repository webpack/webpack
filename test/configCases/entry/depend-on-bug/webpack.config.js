"use strict";

/** @import { Configuration } from "../../../../" */

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
