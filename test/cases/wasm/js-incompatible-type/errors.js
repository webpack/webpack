module.exports = [
	[
		{moduleName: /export-i64-param\.wat/},
		/Export "a" with i64 as parameter can only be used for direct wasm to wasm dependencies/,
		{moduleTrace: /export-i64-param\.js/}
	],
	[
		{moduleName: /export-i64-result\.wat/},
		/Export "a" with i64 as result can only be used for direct wasm to wasm dependencies/,
		{moduleTrace: /export-i64-result\.js/}
	],
	[
		{moduleName: /import-i64\.wat/},
		/Import "n" from "\.\/env.js" with Non-JS-compatible Global Type \(i64\) can only be used for direct wasm to wasm dependencies/,
		{moduleTrace: /index\.js/}
	]
]
