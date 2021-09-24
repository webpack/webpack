module.exports = {
	output: {
		module: true,
		library: {
			type: "module"
		}
	},
	optimization: {
		usedExports: true,
		concatenateModules: true
	},
	target: "browserslist: last 2 chrome versions",
	experiments: {
		outputModule: true
	}
};
