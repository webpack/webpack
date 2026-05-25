"use strict";

const { RawSource } = require("webpack-sources");
const webpack = require("../lib/index");

const createCompilation = () => {
	const compiler = webpack({ mode: "none", entry: "./nope.js" });
	const params = compiler.newCompilationParams();
	return compiler.createCompilation(params);
};

describe("Compilation", () => {
	describe("deleteAsset / renameAsset reverse index", () => {
		it("deleteAsset removes the file from chunk.files and chunk.auxiliaryFiles", () => {
			const compilation = createCompilation();
			const chunk = compilation.addChunk("a");
			compilation.emitAsset("a.js", new RawSource("// a"));
			chunk.files.add("a.js");
			compilation.emitAsset("a.aux.js", new RawSource("// aux"));
			chunk.auxiliaryFiles.add("a.aux.js");

			compilation.deleteAsset("a.js");
			compilation.deleteAsset("a.aux.js");

			expect(chunk.files.has("a.js")).toBe(false);
			expect(chunk.auxiliaryFiles.has("a.aux.js")).toBe(false);
			expect(compilation.getAsset("a.js")).toBeUndefined();
			expect(compilation.getAsset("a.aux.js")).toBeUndefined();
		});

		it("renameAsset renames the file in chunk.files and chunk.auxiliaryFiles", () => {
			const compilation = createCompilation();
			const chunk = compilation.addChunk("a");
			compilation.emitAsset("a.js", new RawSource("// a"));
			chunk.files.add("a.js");
			compilation.emitAsset("a.aux.js", new RawSource("// aux"));
			chunk.auxiliaryFiles.add("a.aux.js");

			compilation.renameAsset("a.js", "b.js");
			compilation.renameAsset("a.aux.js", "b.aux.js");

			expect(chunk.files.has("a.js")).toBe(false);
			expect(chunk.files.has("b.js")).toBe(true);
			expect(chunk.auxiliaryFiles.has("a.aux.js")).toBe(false);
			expect(chunk.auxiliaryFiles.has("b.aux.js")).toBe(true);
		});

		it("renameAsset does not add the new name to chunks that did not hold the old name", () => {
			const compilation = createCompilation();
			const holder = compilation.addChunk("holder");
			const other = compilation.addChunk("other");
			compilation.emitAsset("a.js", new RawSource("// a"));
			holder.files.add("a.js");

			compilation.renameAsset("a.js", "b.js");

			expect(holder.files.has("b.js")).toBe(true);
			expect(other.files.has("b.js")).toBe(false);
			expect(other.files.has("a.js")).toBe(false);
		});

		// emitAsset must invalidate the lazily-built reverse index, otherwise a
		// delete after an early index build would leave a stale chunk.files entry.
		it("deleteAsset cleans chunks for assets added after the index was built", () => {
			const compilation = createCompilation();
			const chunk = compilation.addChunk("a");

			// Force the reverse index to be built (and cached) early.
			compilation.emitAsset("marker.js", new RawSource("// marker"));
			compilation.deleteAsset("marker.js");

			// Emit and attach a new asset after the index already exists.
			compilation.emitAsset("late.js", new RawSource("// late"));
			chunk.files.add("late.js");
			compilation.emitAsset("late.aux.js", new RawSource("// late aux"));
			chunk.auxiliaryFiles.add("late.aux.js");

			compilation.deleteAsset("late.js");
			compilation.deleteAsset("late.aux.js");

			expect(chunk.files.has("late.js")).toBe(false);
			expect(chunk.auxiliaryFiles.has("late.aux.js")).toBe(false);
		});

		it("renameAsset cleans chunks for assets added after the index was built", () => {
			const compilation = createCompilation();
			const chunk = compilation.addChunk("a");

			compilation.emitAsset("marker.js", new RawSource("// marker"));
			compilation.deleteAsset("marker.js");

			compilation.emitAsset("late.js", new RawSource("// late"));
			chunk.files.add("late.js");

			compilation.renameAsset("late.js", "renamed.js");

			expect(chunk.files.has("late.js")).toBe(false);
			expect(chunk.files.has("renamed.js")).toBe(true);
		});

		it("unseal drops the cached reverse index", () => {
			const compilation = createCompilation();
			const chunk = compilation.addChunk("a");
			compilation.emitAsset("a.js", new RawSource("// a"));
			chunk.files.add("a.js");
			// Build the index.
			compilation.emitAsset("marker.js", new RawSource("// marker"));
			compilation.deleteAsset("marker.js");
			expect(compilation._assetToChunkIndex).toBeDefined();

			compilation.unseal();

			expect(compilation._assetToChunkIndex).toBeUndefined();
			expect(compilation._assetToChunkAuxiliaryIndex).toBeUndefined();
		});

		it("deleteAsset cleans every chunk for an asset shared via re-emit", () => {
			const compilation = createCompilation();
			const chunkA = compilation.addChunk("a");
			const chunkB = compilation.addChunk("b");
			const source = new RawSource("// shared");
			compilation.emitAsset("shared.js", source);
			chunkA.files.add("shared.js");
			// Build the index while it only knows about chunkA.
			compilation.emitAsset("marker.js", new RawSource("// marker"));
			compilation.deleteAsset("marker.js");
			// chunkB re-emits the same file (same content -> emitAsset early-return)
			// then attaches it; emitAsset must still invalidate the index.
			compilation.emitAsset("shared.js", source);
			chunkB.files.add("shared.js");

			compilation.deleteAsset("shared.js");

			expect(chunkA.files.has("shared.js")).toBe(false);
			expect(chunkB.files.has("shared.js")).toBe(false);
		});

		it("renameAsset skips chunks that no longer hold the file (stale index)", () => {
			const compilation = createCompilation();
			const chunk = compilation.addChunk("a");
			compilation.emitAsset("a.js", new RawSource("// a"));
			chunk.files.add("a.js");
			// Build the index so it records a.js -> chunk.
			compilation.emitAsset("marker.js", new RawSource("// marker"));
			compilation.deleteAsset("marker.js");
			// Drop the file from the chunk directly, making the cached index stale.
			chunk.files.delete("a.js");

			compilation.renameAsset("a.js", "b.js");

			expect(chunk.files.has("a.js")).toBe(false);
			expect(chunk.files.has("b.js")).toBe(false);
		});

		it("deleteAsset falls back to scanning when the file is not in the index", () => {
			const compilation = createCompilation();
			const chunk = compilation.addChunk("a");
			compilation.emitAsset("standalone.js", new RawSource("// s"));
			// Build the index while standalone.js is in no chunk.
			compilation.emitAsset("marker.js", new RawSource("// marker"));
			compilation.deleteAsset("marker.js");
			// Attach the already-emitted asset directly, bypassing emitAsset.
			chunk.files.add("standalone.js");

			compilation.deleteAsset("standalone.js");

			expect(chunk.files.has("standalone.js")).toBe(false);
		});

		it("renameAsset falls back to scanning when the file is not in the index", () => {
			const compilation = createCompilation();
			const chunk = compilation.addChunk("a");
			compilation.emitAsset("standalone.js", new RawSource("// s"));
			compilation.emitAsset("marker.js", new RawSource("// marker"));
			compilation.deleteAsset("marker.js");
			chunk.files.add("standalone.js");

			compilation.renameAsset("standalone.js", "renamed.js");

			expect(chunk.files.has("standalone.js")).toBe(false);
			expect(chunk.files.has("renamed.js")).toBe(true);
		});
	});
});
