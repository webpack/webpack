const toml = require("toml");

/** @typedef {import("../../../../").ParserOptionsByModuleTypeKnown} ParserOptionsByModuleTypeKnown */

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		mode: "development",
		module: {
			rules: [
				{
					test: /\.toml$/,
					type: "json",
					/** @type {ParserOptionsByModuleTypeKnown['json']} */
					parser: {
						parse(input) {
							// eslint-disable-next-line prefer-rest-params
							expect(arguments).toHaveLength(1);
							return toml.parse(input);
						}
					}
				}
			]
		}
	}
];
