module.exports = {
	optimization: {
		usedExports: true,
		// make 'lib' chunk runtime to be worker + entry
		splitChunks: {
			minSize: 0,
			chunks: "all",
			cacheGroups: {
				lib: {
					test: /[/\\]lib[/\\](a|b|index).js$/,
					name: "lib",
					filename: "bundle-lib.js"
				}
			}
		}
	}
};
