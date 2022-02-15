const path = require("path");
const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "cache pack",
		infrastructureLogErrors: {
			compile: {
				// Module build failed
				["error-hide-stack"]:
					/^Pack got invalid because of write to: Compilation\/modules.+loader\.js!$/
			},
			errors: {
				// load module failed, error in loader
				["load-module-error"]:
					/^Pack got invalid because of write to: Compilation\/modules|json.+error-loader\.js!/
			},
			json: {
				// Module build failed, not a valid JSON
				["import-assertions-type-json"]:
					/^Pack got invalid because of write to: Compilation\/modules|json.+json\/data\/poison$/
			},
			loaders: {
				// Module build failed
				["no-string"]:
					/^Pack got invalid because of write to: Compilation\/modules.+no-string[/\\]loader\.js!.+no-string[/\\]file\.js$/
			},
			parsing: {
				// Module parse failed
				context:
					/^Pack got invalid because of write to: Compilation\/modules|.+dump-file\.txt/
			}
		},
		cache: {
			type: "filesystem",
			buildDependencies: {
				defaultWebpack: []
			}
		},
		snapshot: {
			managedPaths: [path.resolve(__dirname, "../node_modules")]
		},
		optimization: {
			innerGraph: true,
			usedExports: true,
			concatenateModules: true
		}
	});
});
