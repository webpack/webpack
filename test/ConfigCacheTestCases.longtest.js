const { describeCases, logErrors } = require("./ConfigTestCases.template");

describeCases({
	name: "ConfigCacheTestCases",
	infrastructureLogErrors: {
		allowList: [
			{
				//  Pack got invalid because of write to: Compilation/modules|/home/runner/work/webpack/webpack/test/configCases/wasm/missing-wasm-experiment/wasm.wasm
				category: "wasm",
				test: "missing-wasm-experiment"
			},
			{
				//  Pack got invalid because of write to: RealContentHashPlugin|analyse|index.html
				category: "process-assets",
				test: "html-plugin"
			},
			{
				//  Pack got invalid because of write to: Compilation/modules|/home/runner/work/webpack/webpack/test/cases/parsing/context/templates/dump-file.txt
				category: "parsing",
				test: "context"
			},
			{
				// Pack got invalid because of write to: Compilation/modules|/home/runner/work/webpack/webpack/test/configCases/loaders/options/loader-1.js??ruleSet[1].rules[9]!/home/runner/work/webpack/webpack/test/configCases/loaders/options/error1.js
				category: "loaders",
				test: "options"
			},
			{
				// Pack got invalid because of write to: TerserWebpackPlugin|bundle0.js
				category: "assets",
				test: "delete-asset"
			},
			{
				// Pack got invalid because of write to: webpack.HttpUriPlugin|https://raw.githubusercontent.com//webpack//webpack//main/CODE_OF_CONDUCT.md
				category: "asset-modules",
				test: "http-url"
			}
		],
		filter: [logErrors.PERSISTENCE_CACHE_INVALIDATE_ERROR]
	},
	cache: {
		type: "filesystem",
		buildDependencies: {
			defaultWebpack: []
		}
	}
});
