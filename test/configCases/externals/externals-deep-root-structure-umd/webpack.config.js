module.exports = {
	output: {
		libraryTarget: "umd"
	},
	externals: [/^ext-lib\/.+$/],
	node: {
		__dirname: false,
		__filename: false
	}
};
