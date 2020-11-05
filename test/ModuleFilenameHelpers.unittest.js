"use strict";

const { createFilename } = require("../lib/ModuleFilenameHelpers");
const { createFsFromVolume, Volume } = require("memfs");
const path = require("path");

let webpack;

const createSimpleCompiler = progressOptions => {
	const compiler = webpack({
		context: path.join(__dirname, "fixtures"),
		entry: "./a.js",
		infrastructureLogging: {
			debug: /Progress/
		}
	});

	compiler.outputFileSystem = createFsFromVolume(new Volume());

	new webpack.ProgressPlugin({
		activeModules: true,
		...progressOptions
	}).apply(compiler);

	return compiler;
};

describe("ModuelFilenameHelpers", () => {
	beforeEach(() => {
		webpack = require("..");
	});
	describe("createFilename", () => {
		// next.js uses filesnames like [id] to indicate route parameters
		// Webpack should preserve these patterns when generating source maps
		it("Should not truncate [id] characters from a filename", () => {
			const compiler = createSimpleCompiler();
			const compilation = compiler.createCompilation();

			const options = {
				moduleFilenameTemplate: "webpack://[namespace]/[resourcePath]",
				namespace: "_N_E"
			};

			const module1 = "webpackUser/nextjs/pages/items/[id].tsx";
			const result1 = createFilename(module1, options, {
				requestShortener: compilation.runtimeTemplate.requestShortener,
				chunkGraph: compiler.chunkGraph
			});

			expect(result1).toBe(
				"webpack://_N_E/webpackUser/nextjs/pages/items/[id].tsx"
			);

			// As there's special rules for [id] we should make sure other names work too
			const module2 = "webpackUser/nextjs/pages/items/[test].tsx";
			const result2 = createFilename(module2, options, {
				requestShortener: compilation.runtimeTemplate.requestShortener,
				chunkGraph: compiler.chunkGraph
			});

			expect(result2).toBe(
				"webpack://_N_E/webpackUser/nextjs/pages/items/[test].tsx"
			);
		});
	});
});
