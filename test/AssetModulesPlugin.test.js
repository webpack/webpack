const AssetModulesPlugin = require("../lib/asset/AssetModulesPlugin");

describe("AssetModulesPlugin", () => {
	it("should handle failed asset module paths correctly", () => {
		// Mock compilation
		const compiler = {
			context: "/webpack/context",
			hooks: {
				compilation: {
					tap: (name, callback) => {
						const compilation = {
							hooks: {
								renderManifest: {
									tap: (_, renderManifestHook) => {
										// Mock data
										const normalModule = {
											getNumberOfErrors: () => 1,
											nameForCondition: () =>
												"/absolute/path/to/source/file.scss",
											buildInfo: {},
											getSourceTypes: () => ["asset"],
											generator: {
												getTypes: () => ["asset"]
											}
										};

										const chunkGraph = {
											getModuleId: () => "123",
											getModuleHash: () => "hash123"
										};

										const chunk = {
											runtime: "runtime"
										};

										// Mock objects
										const result = [];
										const codeGenResults = new Map();
										codeGenResults.set(normalModule, {
											sources: new Map([["asset", { source: () => "content" }]])
										});

										renderManifestHook(result, {
											codeGenerationResults: {
												get: module => codeGenResults.get(module)
											},
											chunkGraph,
											moduleGraph: {},
											chunk
										});

										// Verifying the result
										expect(result.length).toBe(1);
										expect(result[0].filename).toBe(
											"absolute/path/to/source/file.scss"
										);

										// Test with Windows-style path
										normalModule.nameForCondition = () =>
											"C:\\absolute\\path\\to\\source\\file.scss";
										result.length = 0; // Clear results

										renderManifestHook(result, {
											codeGenerationResults: {
												get: module => codeGenResults.get(module)
											},
											chunkGraph,
											moduleGraph: {},
											chunk
										});

										expect(result.length).toBe(1);
										expect(result[0].filename).toBe(
											"absolute/path/to/source/file.scss"
										);
									}
								}
							}
						};
						callback(compilation);
					}
				}
			}
		};

		// Create and apply the plugin
		const plugin = new AssetModulesPlugin();
		plugin.apply(compiler);
	});
});
