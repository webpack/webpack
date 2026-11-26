"use strict";

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @import { Argv } from "../../../helpers/prepareOptions.js" */
/** @import { Configuration, Compiler } from "../../../../" */

const PLUGIN_NAME = "RetargetedSymlinkCleanPlugin";

/**
 * @param {Argv["env"]} env environment
 * @param {{ testPath: string }} options test paths
 * @returns {Configuration[]} configurations
 */
module.exports = (env, { testPath }) =>
	[false, true].map((dry) => ({
		output: {
			path: path.join(testPath, dry ? "dry" : "normal"),
			allowOutside: true,
			clean: { dry }
		},
		plugins: [
			/**
			 * @param {Compiler} compiler compiler
			 */
			(compiler) => {
				compiler.hooks.initialize.tap(PLUGIN_NAME, () => {
					const previousTarget = `${compiler.outputPath}-old`;
					for (const directory of [
						previousTarget,
						`${compiler.outputPath}-new`,
						`${compiler.outputPath}-next`
					]) {
						rimraf.sync(directory);
						fs.mkdirSync(directory, { recursive: true });
					}
					fs.writeFileSync(path.join(previousTarget, "step.0.txt"), "foreign");
					fs.mkdirSync(compiler.outputPath, { recursive: true });
					rimraf.sync(path.join(compiler.outputPath, "linked"));
					fs.symlinkSync(
						previousTarget,
						path.join(compiler.outputPath, "linked"),
						"junction"
					);
				});
				compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
					compilation.hooks.processAssets.tap(PLUGIN_NAME, () => {
						const { RawSource } = compiler.webpack.sources;
						const target = `${compiler.outputPath}-${
							Number(currentWatchStep.step) < 2 ? "new" : "next"
						}`;
						compilation.emitAsset("linked", new RawSource(""), {
							symlink: { target, isDirectory: true }
						});
						compilation.emitAsset(
							`linked/step.${currentWatchStep.step}.txt`,
							new RawSource("emitted")
						);
						compilation.emitAsset(
							`linked/${currentWatchStep.step}.hot-update.json`,
							new RawSource("{}"),
							{ hotModuleReplacement: true }
						);
					});
				});
			}
		]
	}));
