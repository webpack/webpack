module.exports = [
	[
		{ moduleName: /tla\.js/ },
		/The generated code contains 'async\/await'/,
		/"topLevelAwait"/
	],
	[
		{ moduleName: /external \["import\.js","request"\]/ },
		/The generated code contains 'async\/await'/,
		/"external import"/
	],
	[
		{ moduleName: /external \["module\.js","request"\]/ },
		/The generated code contains 'async\/await'/,
		/"external module"/
	],
	[
		{ moduleName: /external "Promise\.resolve\('promise\.js'\)"/ },
		/The generated code contains 'async\/await'/,
		/"external promise"/
	],
	[
		{ moduleName: /wasm\.wat/ },
		/The generated code contains 'async\/await'/,
		/"asyncWebAssembly"/
	]
];
