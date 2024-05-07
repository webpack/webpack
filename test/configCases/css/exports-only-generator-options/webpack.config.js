/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		target: "web",
		mode: "development",
		module: {
			generator: {
				css: {
					exportsOnly: true
				},
				"css/module": {
					exportsOnly: false
				}
			},
			rules: [
				{
					resourceQuery: /\?module/,
					type: "css/module"
				},
				{
					resourceQuery: /\?exportsOnly/,
					generator: {
						exportsOnly: true
					},
					type: "css/global"
				}
			]
		},
		experiments: {
			css: true
		},
		node: {
			__dirname: false
		}
	}
];
