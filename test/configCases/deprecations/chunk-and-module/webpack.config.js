const { ChunkGraph, ExternalModule } = require("../../../../");
/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		compiler => {
			compiler.hooks.done.tap("Test", ({ compilation }) => {
				const { chunkGraph } = compilation;
				for (const chunk of compilation.chunks) {
					expect(chunk.entryModule).toBe(
						[...chunkGraph.getChunkEntryModulesIterable(chunk)][0]
					);
					expect(chunk.hasEntryModule()).toBe(true);
					expect(chunk.getNumberOfModules()).toBe(3);
					const module = new ExternalModule("external", "var", "external");
					ChunkGraph.setChunkGraphForModule(module, chunkGraph);
					chunk.addModule(module);
					module.addChunk(chunk);
					expect(chunk.getNumberOfModules()).toBe(4);
					expect(new Set(chunk.modulesIterable)).toContain(module);
					expect(new Set(chunk.getModules())).toContain(chunk.entryModule);
					expect(chunk.hasModuleInGraph(m => m === module)).toBe(true);
					expect(chunk.containsModule(module)).toBe(true);
					chunk.removeModule(module);
					module.removeChunk(chunk);
					expect(chunk.getNumberOfModules()).toBe(3);
					expect(chunk.containsModule(module)).toBe(false);
					expect(chunk.isEmpty()).toBe(false);
					expect(chunk.modulesSize()).toBeTypeOf("number");
					expect(chunk.size()).toBe(chunk.modulesSize() * 10 + 10000);
					expect(chunk.getChunkModuleMaps(m => true)).toEqual({
						id: {},
						hash: {}
					});

					const m = chunk.entryModule;
					expect(
						m
							.source(
								compilation.dependencyTemplates,
								compilation.runtimeTemplate
							)
							.source()
					).toMatch(/should compile with deprecations/);
					expect(m.hash).toMatch(/^[0-9a-f]{32}$/);
					expect(m.renderedHash).toMatch(/^[0-9a-f]{20}$/);
					expect(m.profile).toBe(undefined);
					expect(m.index).toBe(0);
					m.index = 1000;
					expect(m.index).toBe(1000);
					expect(m.index2).toBe(0);
					m.index2 = 1000;
					expect(m.index2).toBe(1000);
					expect(m.depth).toBe(0);
					m.depth = 1000;
					expect(m.depth).toBe(1000);
					expect(m.issuer).toBe(null);
					m.issuer = module;
					expect(m.issuer).toBe(module);
					expect(
						typeof m.usedExports === "boolean" ? [] : [...m.usedExports]
					).toEqual(["testExport"]);
					expect(Array.isArray(m.optimizationBailout)).toBe(true);
					expect(m.optional).toBe(false);
					expect(m.isInChunk(chunk)).toBe(true);
					expect(m.isEntryModule()).toBe(true);
					expect(m.getChunks()).toEqual([chunk]);
					expect(m.getNumberOfChunks()).toBe(1);
					expect(Array.from(m.chunksIterable)).toEqual([chunk]);
					expect(m.isProvided("testExport")).toBe(true);
					expect(m.isProvided("otherExport")).toBe(false);
				}
			});
		}
	]
};
