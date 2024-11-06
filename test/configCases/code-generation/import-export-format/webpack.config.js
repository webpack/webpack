/** @type {import("../../../../").Configuration} */
module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
	optimization: {
		concatenateModules: true,
		usedExports: true,
		providedExports: true,
		minimize: false,
		mangleExports: "size"
	}
};
