const toml = require("toml");

module.exports = [
	{
		mode: "development",
		module: {
			rules: [
				{
					test: /\.toml$/,
					type: "json",
					parser: {
						parse(input) {
							expect(arguments.length).toBe(1);
							return toml.parse(input);
						}
					}
				}
			]
		}
	},
	{
		mode: "development",
		module: {
			rules: [
				{
					test: /\.toml$/,
					type: "json",
					parser: {
						parse(input) {
							expect(arguments.length).toBe(1);
							return JSON.stringify(toml.parse(input));
						}
					}
				}
			]
		}
	}
];
