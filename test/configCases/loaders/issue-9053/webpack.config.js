module.exports = {
	module: {
		rules: [
			{
				test: /c\.js$/,
				use: ["loader2"]
			}
		]
	}
};
