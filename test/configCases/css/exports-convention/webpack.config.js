const common = {
	mode: "development",
	module: {
		rules: [
			{
				test: /\.module\.css$/,
				type: "css/module",
				oneOf: [
					{
						resourceQuery: /\?as-is$/,
						generator: {
							exportsConvention: "as-is"
						}
					},
					{
						resourceQuery: /\?camel-case$/,
						generator: {
							exportsConvention: "camel-case"
						}
					},
					{
						resourceQuery: /\?camel-case-only$/,
						generator: {
							exportsConvention: "camel-case-only"
						}
					},
					{
						resourceQuery: /\?dashes$/,
						generator: {
							exportsConvention: "dashes"
						}
					},
					{
						resourceQuery: /\?dashes-only$/,
						generator: {
							exportsConvention: "dashes-only"
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
