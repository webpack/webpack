const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		target: "web",
		mode: "development",
		experiments: {
			css: true
		},
		resolve: {
			alias: {
				"/alias.css": false
			},
			byDependency: {
				"css-import": {
					conditionNames: ["custom-name", "..."],
					extensions: [".mycss", "..."]
				}
			}
		},
		module: {
			rules: [
				{
					test: /\.mycss$/,
					loader: "./string-loader",
					type: "css/global"
				},
				{
					test: /\.less$/,
					loader: "less-loader",
					type: "css/global"
				}
			]
		},
		externals: {
			"external-1.css": "css-import external-1.css",
			"external-2.css": "css-import external-2.css",
			"external-3.css": "css-import external-3.css",
			"external-4.css": "css-import external-4.css",
			"external-5.css": "css-import external-5.css",
			"external-6.css": "css-import external-6.css",
			"external-7.css": "css-import external-7.css",
			"external-8.css": "css-import external-8.css",
			"external-9.css": "css-import external-9.css",
			"external-10.css": "css-import external-10.css",
			"external-11.css": "css-import external-11.css",
			"external-12.css": "css-import external-12.css",
			"external-13.css": "css-import external-13.css",
			"external-14.css": "css-import external-14.css"
		},
		plugins: [new webpack.IgnorePlugin({ resourceRegExp: /ignore\.css/ })]
	},
	{
		target: "web",
		mode: "development",
		experiments: {
			css: true
		},
		module: {
			parser: {
				css: {
					import: false
				}
			}
		}
	}
];
