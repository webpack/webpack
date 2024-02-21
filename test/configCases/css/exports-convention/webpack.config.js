const common = {
	mode: "development",
	module: {
		rules: [
			{
				test: /\.module\.css$/,
				type: "css/module",
				oneOf: [
					{
						resourceQuery: /\?asIs$/,
						generator: {
							exportsConvention: "asIs"
						}
					},
					{
						resourceQuery: /\?camelCase$/,
						generator: {
							exportsConvention: "camelCase"
						}
					},
					{
						resourceQuery: /\?camelCaseOnly$/,
						generator: {
							exportsConvention: "camelCaseOnly"
						}
					},
					{
						resourceQuery: /\?dashes$/,
						generator: {
							exportsConvention: "dashes"
						}
					},
					{
						resourceQuery: /\?dashesOnly$/,
						generator: {
							exportsConvention: "dashesOnly"
						}
					},
					{
						resourceQuery: /\?upper$/,
						generator: {
							exportsConvention: name => name.toUpperCase()
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
