const toml = require("toml");
const NormalModule = require("../../../../lib/NormalModule");

module.exports = [
	{
		mode: "development",
		module: {
			rules: [
				{
					test: /\.toml$/,
					type: "json",
					parser: {
						parse(input, module) {
							expect(typeof input).toBe("string");
							expect(module).toBeInstanceOf(NormalModule);

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
						parse(input, module) {
							expect(typeof input).toBe("string");
							expect(module).toBeInstanceOf(NormalModule);

							return JSON.stringify(toml.parse(input));
						}
					}
				}
			]
		}
	}
];
