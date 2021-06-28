module.exports = {
	output: {
		module: true,
		library: {
			type: "module"
		}
	},
	optimization: {
		concatenateModules: true
	},
	experiments: {
		outputModule: true
	}
};
