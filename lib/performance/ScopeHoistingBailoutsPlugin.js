/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const ScopeHoistingBailoutsWarning = require("../errors/ScopeHoistingBailoutsWarning");
const {
	BAILOUT_PREFIX,
	REJECTED_PREFIX
} = require("../optimize/ModuleConcatenationPlugin");
const { compareStrings } = require("../util/comparators");
const getModuleSize = require("./getModuleSize");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import Module from "../Module" */
/** @import RequestShortener from "../RequestShortener" */
/**
 * @import {
 * 	ScopeHoistingBailoutGroup
 * } from "../errors/ScopeHoistingBailoutsWarning"
 */

const PLUGIN_NAME = "ScopeHoistingBailoutsPlugin";

// Reasons repeat far more than they differ, so a few name the problem.
const MAX_REPORTED_REASONS = 5;

// Enough per reason to recognize the offenders without listing every module.
const MAX_REPORTED_NAMES = 3;

// A source position makes two identical reasons look like two problems.
const POSITION_REGEXP = / at \d+:\d+-\d+$/;

/**
 * The module's own reasons for staying out of a scope, without the ones it
 * only carries because something it imports bailed out.
 * @param {(string | ((requestShortener: RequestShortener) => string))[]} bailouts what the module graph recorded
 * @param {RequestShortener} requestShortener the request shortener
 * @returns {string[]} the reasons, stripped of their prefix and position
 */
const getOwnReasons = (bailouts, requestShortener) => {
	/** @type {string[]} */
	const reasons = [];

	for (const bailout of bailouts) {
		const message =
			typeof bailout === "function" ? bailout(requestShortener) : bailout;

		if (!message.startsWith(BAILOUT_PREFIX)) continue;

		const reason = message.slice(BAILOUT_PREFIX.length);

		// One root lists every module it could not take in; each of those
		// modules reports the same problem itself.
		if (reason.startsWith(REJECTED_PREFIX)) continue;

		reasons.push(reason.replace(POSITION_REGEXP, ""));
	}

	return reasons;
};

class ScopeHoistingBailoutsPlugin {
	/**
	 * Creates an instance of ScopeHoistingBailoutsPlugin.
	 * @param {PerformanceOptions} options the plugin options
	 */
	constructor(options) {
		/** @type {PerformanceOptions["hints"]} */
		this.hints = options.hints;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const hints = this.hints;

		if (!hints) return;

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			// After seal: a module that was hoisted is gone from `modules` by now,
			// absorbed into the concatenation that took it.
			compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
				const { chunkGraph, moduleGraph, requestShortener } = compilation;
				/** @type {Map<string, { size: number, name: string }[]>} */
				const byReason = new Map();
				/** @type {Set<Module>} */
				const affected = new Set();

				for (const module of compilation.modules) {
					// One webpack left out was never a candidate.
					if (chunkGraph.getNumberOfModuleChunks(module) === 0) continue;

					const reasons = getOwnReasons(
						moduleGraph.getOptimizationBailout(module),
						requestShortener
					);

					if (reasons.length === 0) continue;

					affected.add(module);

					const entry = {
						name: module.readableIdentifier(requestShortener),
						size: getModuleSize(module)
					};

					for (const reason of new Set(reasons)) {
						const modules = byReason.get(reason);

						if (modules === undefined) {
							byReason.set(reason, [entry]);
						} else {
							modules.push(entry);
						}
					}
				}

				if (affected.size === 0) return;

				/** @type {ScopeHoistingBailoutGroup[]} */
				const groups = [];

				for (const [reason, modules] of byReason) {
					// Ties break by name: module order is not stable across runtimes.
					modules.sort(
						(a, b) => b.size - a.size || compareStrings(a.name, b.name)
					);

					groups.push({
						reason,
						count: modules.length,
						names: modules.slice(0, MAX_REPORTED_NAMES).map((m) => m.name)
					});
				}

				groups.sort(
					(a, b) => b.count - a.count || compareStrings(a.reason, b.reason)
				);

				const warning = new ScopeHoistingBailoutsWarning(
					groups.slice(0, MAX_REPORTED_REASONS),
					affected.size
				);

				if (hints === "error") {
					compilation.errors.push(warning);
				} else if (hints === "stats") {
					compilation.hints.push(warning);
				} else {
					compilation.warnings.push(warning);
				}
			});
		});
	}
}

module.exports = ScopeHoistingBailoutsPlugin;
