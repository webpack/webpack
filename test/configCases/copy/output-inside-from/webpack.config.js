"use strict";

const fs = require("fs");
const path = require("path");
/** @type {{ sync: (target: string) => void }} */
const rimraf = require("rimraf");
const webpack = require("../../../../");

/** @typedef {import("../../../../").Compilation} Compilation */
/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {import("../../../../").Configuration} Configuration */

const PLUGIN_NAME = "OutputInsideFromTest";

/**
 * A project whose `output.path` is below what its patterns copy, holding a file
 * an earlier build left there; one per build, as each writes into its own.
 * @param {string} root where the project is laid out
 * @returns {{ staticPath: string, outputPath: string, stalePath: string, plugin: (compiler: Compiler) => void }} its paths and the plugin laying it out
 */
const createProject = (root) => {
	const staticPath = path.join(root, "static");
	const outputPath = path.join(staticPath, "build");
	const stalePath = path.join(outputPath, "stale.txt");
	/** @type {(compiler: Compiler) => void} */
	const plugin = (compiler) => {
		compiler.hooks.environment.tap(PLUGIN_NAME, () => {
			rimraf.sync(root);
			fs.mkdirSync(path.join(staticPath, "nested"), { recursive: true });
			fs.mkdirSync(outputPath, { recursive: true });
			fs.writeFileSync(path.join(staticPath, "keep.txt"), "keep");
			fs.writeFileSync(path.join(staticPath, "nested", "deep.txt"), "deep");
			fs.writeFileSync(stalePath, "stale");
		});
	};
	return { staticPath, outputPath, stalePath, plugin };
};

/**
 * @param {(compilation: Compilation) => string | undefined} check the mismatch of one compilation
 * @returns {(compiler: Compiler) => void} a plugin reporting it as an error
 */
const expectCompilation = (check) => (compiler) => {
	compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
		compilation.hooks.afterProcessAssets.tap(PLUGIN_NAME, () => {
			const mismatch = check(compilation);
			if (mismatch) compilation.errors.push(new webpack.WebpackError(mismatch));
		});
	});
};

/**
 * @param {(copiedPath: string) => boolean | undefined} ignore what the hook answers
 * @returns {(compiler: Compiler) => void} a plugin tapping the `ignore` hook
 */
const ignoreHook = (ignore) => (compiler) => {
	compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
		webpack.CopyPlugin.getCompilationHooks(compilation).ignore.tap(
			PLUGIN_NAME,
			ignore
		);
	});
};

/** @type {(env: unknown, argv: { testPath: string }) => Configuration[]} */
module.exports = (env, { testPath }) => {
	// laid out outside the repository, as the builds write into them
	const ignored = createProject(`${testPath}-ignored`);
	const byDefault = createProject(`${testPath}-default`);
	const hooked = createProject(`${testPath}-hooked`);
	const ignoredBase = createProject(`${testPath}-ignored-base`);
	const hookedOutputPath = hooked.outputPath.split(path.sep).join("/");
	return [
		{
			entry: "./ignored.js",
			output: {
				path: ignored.outputPath,
				copy: [
					{
						// `ignore` is resolved from the context, which the tree is outside of
						context: ignored.staticPath,
						from: ignored.staticPath,
						globOptions: { ignore: ["**/build/**"] }
					}
				]
			},
			plugins: [
				ignored.plugin,
				expectCompilation((compilation) =>
					compilation.fileDependencies.has(ignored.stalePath)
						? "a file 'globOptions.ignore' names should not be watched"
						: undefined
				)
			]
		},
		{
			entry: "./default.js",
			output: {
				path: byDefault.outputPath,
				copy: [byDefault.staticPath]
			},
			plugins: [byDefault.plugin]
		},
		{
			entry: "./hooked.js",
			output: {
				path: hooked.outputPath,
				copy: [hooked.staticPath]
			},
			plugins: [
				hooked.plugin,
				ignoreHook((copiedPath) =>
					copiedPath.startsWith(hookedOutputPath) ? true : undefined
				)
			]
		},
		{
			entry: "./ignored-base.js",
			output: {
				path: ignoredBase.outputPath,
				copy: [{ from: ignoredBase.outputPath, to: "out" }]
			},
			plugins: [
				ignoredBase.plugin,
				ignoreHook(() => true),
				// watching it would rebuild on what the build itself writes there
				expectCompilation((compilation) =>
					compilation.contextDependencies.has(ignoredBase.outputPath)
						? "a base the hook ignores should not be watched"
						: undefined
				)
			]
		}
	];
};
