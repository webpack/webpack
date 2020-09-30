/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const path = require("path");
const validateOptions = require("schema-utils");
const schema = require("../schemas/plugins/CleanPlugin.json");

/** @typedef {import("../declarations/plugins/CleanPlugin").CleanPluginArgument} CleanPluginArgument */
/** @typedef {import("./Compiler")} Compiler */

/**
 * @param {import("./util/fs").OutputFileSystem} outputFS output fs
 * @param {string} from from directory
 * @returns {{files: Array<string>, directories: Array<string>}} collected files and directories
 */
function readDir(outputFS, from) {
	const collectedFiles = [];
	const collectedDirectories = [];
	const stack = [from];
	let cursor;

	while ((cursor = stack.pop())) {
		const stat = outputFS.statSync(cursor);

		if (stat.isDirectory()) {
			const items = outputFS.readdirSync(cursor);

			if (from !== cursor) {
				const relative = path.relative(from, cursor);
				collectedDirectories.push(relative);
			}

			for (let i = 0; i < items.length; i++) {
				stack.push(path.join(cursor, items[i]));
			}
		} else {
			const relative = path.relative(from, cursor);
			collectedFiles.push(relative);
		}
	}

	return {
		files: collectedFiles,
		directories: collectedDirectories
	};
}

class CleanPlugin {
	/**
	 * @param {CleanPluginArgument} [options] options
	 */
	constructor(options) {
		this.options = Object.assign({ enabled: true, dry: false }, options || {});

		if (options && typeof options === "object") {
			validateOptions(schema, options, {
				name: "Clean Plugin",
				baseDataPath: "options"
			});
		}
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		let emittedOnce = false;
		const logger = compiler.getInfrastructureLogger("webpack.Clean");
		const handleDir = (outputPath, directory) => {
			if (this.options.dry) {
				logger.info(`Directory [${directory}] will be removed in non-dry mode`);
			} else {
				const abs = path.join(outputPath, directory);
				if (compiler.outputFileSystem.existsSync(abs)) {
					compiler.outputFileSystem.rmdirSync(abs, {
						recursive: true
					});
				}
			}
		};
		const handleFile = (outputPath, file) => {
			if (this.options.dry) {
				logger.info(`Asset [${file}] will be removed in non-dry mode`);
			} else {
				const abs = path.join(outputPath, file);
				compiler.outputFileSystem.unlinkSync(abs);
			}
		};

		// do it before emitting for not to iterate many files
		compiler.hooks.emit.tap(
			{
				name: "CleanPlugin",
				stage: 100
			},
			compilation => {
				if (emittedOnce) {
					return;
				}

				const outputPath = compilation.getPath(compiler.outputPath, {});

				if (
					!compiler.outputFileSystem ||
					!compiler.outputFileSystem.existsSync(outputPath)
				) {
					return;
				}

				const assetsDirectories = new Set();

				for (const asset in compilation.assets) {
					const parts = asset.split(path.sep).slice(0, -1);

					parts.reduce((all, part) => {
						const directory = path.join(all, part);
						assetsDirectories.add(directory);
						return directory;
					}, "");
				}

				const collected = readDir(compiler.outputFileSystem, outputPath);

				for (const file of collected.files) {
					if (!(file in compilation.assets)) {
						handleFile(outputPath, file);
					}
				}

				for (const directory of collected.directories) {
					if (!assetsDirectories.has(directory)) {
						handleDir(outputPath, directory);
					}
				}

				emittedOnce = true;
			}
		);
	}
}

module.exports = CleanPlugin;
