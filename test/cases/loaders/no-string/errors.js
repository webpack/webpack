module.exports = [
	[
		{moduleName: /\.\/loaders\/no-string\/loader\.js!\.\/loaders\/no-string\/file\.js/},
		/Module build failed: Error: Final loader \(\.\/loaders\/no-string\/loader\.js\) didn't return a Buffer or String/
	],
	[
		{moduleName: /\.\/loaders\/no-string\/loader\.js!\.\/loaders\/no-string\/pitch-loader\.js!\.\/loaders\/no-string\/file\.js/},
		/Module build failed: Error: Final loader \(\.\/loaders\/no-string\/loader\.js\) didn't return a Buffer or String/
	]
];
