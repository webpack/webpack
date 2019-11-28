const toml = require("toml");
const json5 = require("json5");
const yaml = require("yamljs");

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
			},
			{
				test: /\.json$/,
				type: "json",
				parser: {
					parse(input) {
						return json5.parse(input);
					}
				}
			},
			{
				test: /\.yaml$/,
				type: "json",
				parser: {
					parse(input) {
						return yaml.parse(input);
					}
				}
			}
		]
	}
};
