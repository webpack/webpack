"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: ["./a.js", "./index.js"]
	},
	output: {
		library: {
			entryExports: "all",
			name: "PickedLib",
			type: "assign",
			export: "picked"
		}
	}
};
