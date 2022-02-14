const { describeCases } = require("./ConfigTestCases.template");

describeCases({
	name: "ConfigCacheTestCases",
	infrastructureLogErrors: {
		wasm: {
			// Can not compile wasm module
			["missing-wasm-experiment"]:
				/^Pack got invalid because of write to: Compilation\/modules.+wasm.wasm$/
		},
		parsing: {
			// Module parse failed
			context:
				/^Pack got invalid because of write to: Compilation\/modules|.+dump-file\.txt/
		},
		loaders: {
			// Error in loader
			options: [
				/^Pack got invalid because of write to: Compilation\/modules.+loaders[/\\]options[/\\]error1\.js$/,
				/^Pack got invalid because of write to: Compilation\/modules.+loaders[/\\]options[/\\]error2\.js$/
			]
		},
		["asset-modules"]: {
			["http-url"]:
				/^Pack got invalid because of write to: webpack\.HttpUriPlugin|https:\/\/raw.githubusercontent.com\/\/webpack\/\/webpack\/\/main\/CODE_OF_CONDUCT\.md$/
		}
	},
	cache: {
		type: "filesystem",
		buildDependencies: {
			defaultWebpack: []
		}
	}
});
