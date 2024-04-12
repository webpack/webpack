/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	module: {
		rules: [
			{
				resourceQuery: /\?default/,
				parser: {
					namedExports: false
				},
				type: "css/module"
			},
			{
				resourceQuery: /\?named/,
				parser: {
					namedExports: true
				},
				type: "css/module"
			}
		]
	},
	experiments: {
		css: true
	}
};
