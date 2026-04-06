"use strict";

const path = require("path");
const { Volume, createFsFromVolume } = require("memfs");
const webpack = require("..");

describe("GraphIntegrity (Integration)", () => {
	it("should verify graph integrity during compiler optimization", (done) => {
		const compiler = webpack({
			context: path.join(__dirname, "fixtures"),
			mode: "production",
			entry: "./a.js",
			output: { path: "/" }
		});
		compiler.outputFileSystem = createFsFromVolume(new Volume());

		compiler.hooks.compilation.tap("test", (compilation) => {
			compilation.hooks.optimize.tap("test", () => {
				const { chunkGraph } = compilation;
				const [chunk] = compilation.chunks;
				const modules = [...chunkGraph.getChunkModulesIterable(chunk)];

				expect(modules.length).toBeGreaterThanOrEqual(1);

				const oldModule = modules[0];
				const newModule = {
					identifier: () => "mock-module-identifier",
					getSourceTypes: () => ["javascript"],
					size: () => 0,
					identifierIndex: 0
				};

				chunkGraph.replaceModule(oldModule, newModule);

				const hasNew = chunkGraph.isModuleInChunk(newModule, chunk);
				const hasOld = chunkGraph.isModuleInChunk(oldModule, chunk);

				if (!hasNew || hasOld) {
					throw new Error("Module replacement failed in ChunkGraph");
				}

				chunkGraph.connectChunkAndModule(chunk, oldModule);
				chunkGraph.disconnectChunkAndModule(chunk, oldModule);

				const [group] = compilation.chunkGroups;
				if (group) {
					group.getChildren();
				}
			});
		});

		compiler.run((_err) => {
			compiler.close((closeErr) => {
				if (_err || closeErr) return done(_err || closeErr);
				done();
			});
		});
	}, 60000);
});
