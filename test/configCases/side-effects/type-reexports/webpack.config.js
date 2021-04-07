module.exports = [
	{
		output: {
			pathinfo: "verbose"
		},
		optimization: {
			concatenateModules: true,
			sideEffects: true,
			usedExports: true
		}
	},
	{
		output: {
			pathinfo: "verbose"
		},
		optimization: {
			concatenateModules: false,
			sideEffects: true,
			usedExports: true
		}
	}
];
