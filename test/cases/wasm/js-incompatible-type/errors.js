module.exports = [
	[
		/export-i64-param\.wat/,
		/Export "a" with i64 as parameter can only be used for direct wasm to wasm dependencies/,
		/export-i64-param\.js/
	],
	[
		/export-i64-result\.wat/,
		/Export "a" with i64 as result can only be used for direct wasm to wasm dependencies/,
		/export-i64-result\.js/
	],
	[
		/import-i64\.wat/,
		/Import "n" from "\.\/env.js" with Non-JS-compatible Global Type \(i64\) can only be used for direct wasm to wasm dependencies/,
		/index\.js/
	]
]
