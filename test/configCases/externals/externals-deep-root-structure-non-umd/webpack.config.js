module.exports = {
	output: {
		libraryTarget: "global"
	},
	externals: [/^ext-lib\/.+$/],
	node: {
		__dirname: false,
		__filename: false
	}
};
