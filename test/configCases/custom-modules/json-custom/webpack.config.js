const toml = require("toml");

/** @type {import("../../../../").Configuration[]} */
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
	}
];
