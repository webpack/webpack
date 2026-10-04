"use strict";

const assert = require("assert");
const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("../../../..").Configuration} */
module.exports = {
	mode: "production",
	devtool: false,
	cache: { type: "filesystem" },
	output: { pathinfo: false },
	optimization: { minimize: false, moduleIds: "named", chunkIds: "named" },
	plugins: [
		(compiler) => {
			const hooks = [
				"make",
				"finishMake",
				"finishModules",
				"processAssets",
				"afterSeal",
				"afterCompile",
				"emit",
				"done"
			];
			let failures = 0;
			let failed = false;
			let rebuiltBranches = 0;
			/**
			 * @param {string} hook current hook
			 * @returns {Error | undefined} one failure per edited step
			 */
			const takeError = (hook) => {
				const step = Number(currentWatchStep.step);
				if (
					!compiler.watchMode ||
					hooks[step - 1] !== hook ||
					failures === step
				) {
					return;
				}
				expect(failures).toBe(step - 1);
				expect(rebuiltBranches).toBe(1);
				failures++;
				return new Error(`Injected plugin failure in ${hook}`);
			};
			/**
			 * @param {string} hook current hook
			 * @returns {void}
			 */
			const fail = (hook) => {
				const error = takeError(hook);
				if (error) throw error;
			};
			compiler.hooks.failed.tap("PluginFailure", (error) => {
				expect(failed).toBe(false);
				expect(error.message).toContain(
					`Injected plugin failure in ${hooks[failures - 1]}`
				);
				failed = true;
			});
			compiler.hooks.afterDone.tap("PluginFailure", () => {
				expect(failed).toBe(false);
			});
			compiler.hooks.compilation.tap("PluginFailure", (compilation) => {
				failed = false;
				rebuiltBranches = 0;
				compilation.hooks.succeedModule.tap("PluginFailure", (module) => {
					if (
						module.identifier() === path.join(compiler.context, "branch.js")
					) {
						rebuiltBranches++;
					}
				});
				for (const hook of /** @type {const} */ ([
					"finishModules",
					"processAssets"
				])) {
					compilation.hooks[hook].tapAsync(
						"PluginFailure",
						(_value, callback) => {
							process.nextTick(() => callback(takeError(hook)));
						}
					);
				}
				compilation.hooks.afterSeal.tap("PluginFailure", () =>
					fail("afterSeal")
				);
			});
			compiler.hooks.make.tapAsync("PluginFailure", (compilation, callback) => {
				if (!compiler.watchMode || currentWatchStep.step !== "1" || failures) {
					return callback();
				}
				const module = [...compilation.modules].find(
					(candidate) =>
						candidate.identifier() === path.join(compiler.context, "branch.js")
				);
				assert(module);
				compilation.rebuildModule(module, (error) =>
					callback(error || takeError("make"))
				);
			});
			for (const hook of /** @type {const} */ ([
				"finishMake",
				"afterCompile",
				"emit",
				"done"
			])) {
				compiler.hooks[hook].tap("PluginFailure", () => fail(hook));
			}
			compiler.hooks.done.tap("CheckRecovery", (stats) => {
				if (!compiler.watchMode) return;
				const step = Number(currentWatchStep.step);
				expect(failures).toBe(Math.min(step, hooks.length));
				if (step === 0) return;
				const removed = path.join(
					compiler.context,
					step % 2 === 1 ? "first.js" : "second.js"
				);
				expect(
					[...stats.compilation.modules].some(
						(module) => module.identifier() === removed
					)
				).toBe(false);
			});
		}
	]
};
