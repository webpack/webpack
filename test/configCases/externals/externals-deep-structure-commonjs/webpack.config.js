module.exports = {
	output: {
		libraryTarget: "commonjs"
	},
	externals: [/^ext-lib\/.+$/],
	node: {
		__dirname: false,
		__filename: false
	}
};
