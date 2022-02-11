const path = require("path");
const { describeCases, logErrors } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases({
		name: "cache pack",
		infrastructureLogErrors: {
			allowList: [
				{
					// Pack got invalid because of write to: Compilation/modules|/Users/ivankopeykin/Repositories/webpack/test/cases/compile/error-hide-stack/loader.js!
					category: "compile",
					test: "error-hide-stack"
				},
				{
					// Pack got invalid because of write to: Compilation/modules|json|/Users/ivankopeykin/Repositories/webpack/test/cases/errors/load-module-error/error-loader.js!/Users/ivankopeykin/Repositories/webpack/test/cases/errors/load-module-error/b.json
					category: "errors",
					test: "load-module-error"
				},
				{
					//  Pack got invalid because of write to: Compilation/modules|json|/Users/ivankopeykin/Repositories/webpack/test/cases/json/data/poison
					category: "json",
					test: "import-assertions-type-json"
				},
				{
					// Pack got invalid because of write to: Compilation/modules|/Users/ivankopeykin/Repositories/webpack/test/cases/loaders/no-string/loader.js!/Users/ivankopeykin/Repositories/webpack/test/cases/loaders/no-string/file.js
					category: "loaders",
					test: "no-string"
				},
				{
					// Pack got invalid because of write to: ResolverCachePlugin|normal|dependencyType=|esm|path=|/Users/ivankopeykin/Repositories/webpack/test/cases|request=|./large/big-assets/
					category: "large",
					test: "big-assets"
				},
				{
					// Pack got invalid because of write to: Compilation/modules|/Users/ivankopeykin/Repositories/webpack/test/cases/parsing/context/templates/dump-file.txt
					category: "parsing",
					test: "context"
				}
			],
			filter: [logErrors.PERSISTENCE_CACHE_INVALIDATE_ERROR]
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
