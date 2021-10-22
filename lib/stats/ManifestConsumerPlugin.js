/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const NormalModule = require("../NormalModule");
const { extractManifest } = require("./ManifestPlugin");

/** @typedef {import("../Compiler")} Compiler */

const STAGE = 101;

function getCompilerName(request) {
	return request.slice(/* 'webpack-manifest:'.length */ 17);
}

class ManifestConsumerPlugin {
	/**
	 * Every stats provider compiler should have name
	 * @param {Compiler} statsConsumerCompiler compiler that consumes stats
	 * @param {Compiler[]} statsProviderCompilers compiler that provides stats
	 */
	apply(statsConsumerCompiler, statsProviderCompilers) {
		if (!statsConsumerCompiler.options.experiments.manifest) {
			throw new Error(
				"'manifest' is only allowed when 'experiments.manifest' is enabled"
			);
		}

		const statsByCompilerName = new Map();
		const manifestByCompilerName = new Map();
		const names = new Set();

		function getRawManifest(rawRequest) {
			const name = getCompilerName(rawRequest);
			let manifest = manifestByCompilerName.get(name);

			if (!manifest) {
				const stats = statsByCompilerName.get(name);
				if (!stats) return;
				manifest = extractManifest(stats);
				statsByCompilerName.delete(name);
				manifestByCompilerName.set(name, manifest);
			}

			return JSON.stringify(manifest);
		}

		for (const compiler of statsProviderCompilers) {
			const name = compiler.name;
			names.add(name);
			compiler.hooks.done.tap(
				{
					stage: STAGE,
					name: "ManifestConsumerPlugin"
				},
				stats => {
					statsByCompilerName.set(name, stats);
				}
			);
		}

		statsConsumerCompiler.hooks.compilation.tap(
			"ManifestConsumerPlugin",
			(compilation, { normalModuleFactory }) => {
				normalModuleFactory.hooks.resolveForScheme
					.for("webpack-manifest")
					.tapAsync(
						"ManifestConsumerPlugin",
						(resourceData, resolveData, callback) => {
							const compilerName = getCompilerName(resourceData.resource);

							if (!names.has(compilerName)) {
								return callback(
									new Error(
										`Compiler ${JSON.stringify(compilerName)} not found.`
									)
								);
							}

							resourceData.data.name = compilerName;
							resourceData.data.mimetype = "application/json";
							callback(null, true);
						}
					);
				NormalModule.getCompilationHooks(compilation)
					.readResourceForScheme.for("webpack-manifest")
					.tap("ManifestConsumerPlugin", getRawManifest);
			}
		);
	}
}

module.exports = ManifestConsumerPlugin;
