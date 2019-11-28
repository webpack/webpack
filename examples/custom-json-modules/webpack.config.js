const toml = require("toml");

module.exports = {
	module: {
		rules: [
			{
				test: /\.toml$/,
				type: "json",
				parser: {
					parse(input) {
						return toml.parse(input);
					}
				}
			}
		]
	}
};
