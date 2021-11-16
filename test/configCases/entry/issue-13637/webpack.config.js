/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		"main-system": {
			import: "./index-system.js",
			library: {
				type: "system"
			},
			filename: "main.system.js"
		},
		"main-umd": {
			import: "./index-umd.js",
			library: {
				type: "umd"
			},
			filename: "main.umd.js"
		}
	},
	node: {
		__dirname: false,
		__filename: false
	}
};
