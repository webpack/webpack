/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		target: "node",
		devtool: false,
		entry: "./remove-comment",
		module: {
			rules: [
				{
					parser: {
						extractSourceMap: true
					}
				}
			]
		}
	},
	{
		target: "node",
		entry: "./extract1",
		devtool: "source-map",
		module: {
			rules: [
				{
					parser: {
						extractSourceMap: true
					}
				}
			]
		}
	},
	{
		target: "node",
		entry: "./extract2",
		devtool: "source-map",
		module: {
			rules: [
				{
					parser: {
						extractSourceMap: true
					}
				}
			]
		}
	},
	{
		entry: "./no-source-map",
		devtool: "source-map",
		module: {
			rules: [
				{
					parser: {
						extractSourceMap: true
					}
				}
			]
		}
	}
];
