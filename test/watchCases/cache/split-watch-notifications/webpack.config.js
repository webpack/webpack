"use strict";

const assert = require("assert");
const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @import { Configuration, WebpackPluginInstance, Compiler } from "../../../.." */

/** @returns {Configuration} watch configuration */
module.exports = () => ({
	output: { copy: [{ from: "static", to: "copied" }] },
	plugins: [
		/** @type {WebpackPluginInstance & { reported: boolean }} */ ({
			reported: false,
			/**
			 * @this {{ reported: boolean }}
			 * @param {Compiler} compiler watched compiler
			 * @returns {void}
			 */
			apply(compiler) {
				const file = path.join(compiler.context, "static/data.txt");
				const watchFileSystem = compiler.watchFileSystem;
				assert(watchFileSystem);
				const watch = watchFileSystem.watch.bind(watchFileSystem);
				let filtered = false;
				compiler.hooks.watchRun.tap("SplitWatchNotifications", () => {
					this.reported = Boolean(
						compiler.modifiedFiles && compiler.modifiedFiles.has(file)
					);
				});
				watchFileSystem.watch = (
					files,
					directories,
					missing,
					startTime,
					options,
					callback,
					callbackUndelayed
				) =>
					watch(
						files,
						directories,
						missing,
						startTime,
						options,
						(error, fileTimes, contextTimes, changes, removals) => {
							if (
								!filtered &&
								currentWatchStep.step === "1" &&
								changes &&
								changes.has(file)
							) {
								filtered = true;
								changes = new Set(changes);
								changes.delete(file);
							}
							callback(error, fileTimes, contextTimes, changes, removals);
						},
						callbackUndelayed
					);
			}
		})
	]
});
