const toml = require("toml");

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		mode: "development",
		module: {
			parser: {
				json: {
					parser: {
						parse(input) {
							expect(arguments.length).toBe(1);
							return toml.parse(input);
						}
					}
				}
			},
			rules: [
				{
					test: /\.toml$/,
					type: "json"
				}
			]
		}
	}
];
