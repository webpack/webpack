/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		mode: "production",
		entry: ["./strict"],
		module: {
			parser: {
				javascript: {
					overrideStrict: "strict"
				}
			}
		}
	},
	{
		mode: "production",
		entry: ["./strict"],
		module: {
			parser: {
				javascript: {
					overrideStrict: "non-strict"
				}
			}
		}
	}
];
