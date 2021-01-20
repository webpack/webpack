/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		bundle0: "./index.js",
		bundle1: "./other.js"
	},
	module: {
		parser: {
			javascript: {
				commonjsMagicComments: true
			}
		}
	},
	output: {
		filename: "[name].js"
	},
	node: {
		__dirname: false
	}
};
