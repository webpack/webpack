module.exports = {
	output: {
		module: true
	},
	optimization: {
		usedExports: true,
		concatenateModules: true
	},
	experiments: {
		outputModule: true
	}
};
