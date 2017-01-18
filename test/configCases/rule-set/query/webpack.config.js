module.exports = {
	module: {
		rules: [
			{
				resourceQuery: /^\?loader/,
				use: "./loader?query"
			}
		]
	}
};
