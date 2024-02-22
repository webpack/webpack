const common = {
	mode: "development",
	module: {
		rules: [
			{
				test: /\.css$/,
				type: "css/auto",
				oneOf: [
					{
						resourceQuery: /\?hash$/,
						generator: {
							localIdentName: "[hash]"
						}
					},
					{
						resourceQuery: /\?hash-local$/,
						generator: {
							localIdentName: "[hash]-[local]"
						}
					},
					{
						resourceQuery: /\?path-name-local$/,
						generator: {
							localIdentName: "[path][name]__[local]"
						}
					},
					{
						resourceQuery: /\?file-local$/,
						generator: {
							localIdentName: "[file]__[local]"
						}
					}
				]
			}
		]
	},
	experiments: {
		css: true
	}
};

/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		...common,
		target: "web"
	},
	{
		...common,
		target: "node"
	}
];
