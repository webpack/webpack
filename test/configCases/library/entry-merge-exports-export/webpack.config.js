"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: {
			import: ["./a.js", "./index.js"],
			mergeExports: true
		}
	},
	output: {
		library: {
			name: "PickedLib",
			type: "assign",
			export: "picked"
		}
	}
};
