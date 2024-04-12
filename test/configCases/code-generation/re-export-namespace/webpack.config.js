/** @type {import("../../../../").Configuration} */
module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
	optimization: {
		concatenateModules: false,
		usedExports: true,
		providedExports: true,
		minimize: false,
		mangleExports: false
	}
};
