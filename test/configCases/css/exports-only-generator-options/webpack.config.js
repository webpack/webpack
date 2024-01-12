/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	module: {
		generator: {
			css: {
				exportsOnly: true
			}
		}
	},
	experiments: {
		css: true
	},
	node: {
		__dirname: false
	}
};
