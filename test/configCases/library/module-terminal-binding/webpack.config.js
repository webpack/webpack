module.exports = {
	mode: "production",
	target: "web",
	optimization: {
		minimize: false
	},
	experiments: {
		outputModule: true
	},
	output: {
		library: {
			type: "module"
		},
		module: true
	}
};
