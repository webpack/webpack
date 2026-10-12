/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const {
	createAsyncModuleInitFragment
} = require("../../async-modules/AsyncModuleHelpers");
const { UsageState } = require("../../graph/ExportsInfo");
const InitFragment = require("../../template/InitFragment");
const makeSerializable = require("../../util/makeSerializable");
const NullDependency = require("../core/NullDependency");

/** @import { ReplaceSource } from "webpack-sources" */
/** @import Dependency, { DependencyKinds } from "../../graph/Dependency" */
/** @import { DependencyTemplateContext } from "../../template/DependencyTemplate" */

class ESMCompatibilityDependency extends NullDependency {
	get type() {
		return "harmony export header";
	}
}

makeSerializable(ESMCompatibilityDependency, [
	"webpack/lib/dependencies/esm/ESMCompatibilityDependency",
	// TODO in the next major release: remove, it restores the packs written
	// under the name the file had before the ESM rename
	"webpack/lib/dependencies/HarmonyCompatibilityDependency"
]);

ESMCompatibilityDependency.Template = class ESMExportDependencyTemplate extends (
	NullDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const {
			module,
			runtimeTemplate,
			moduleGraph,
			initFragments,
			runtimeRequirements,
			runtime,
			concatenationScope,
			getData
		} = templateContext;
		// a wrapped module has a real exports object that still needs `__esModule`
		if (concatenationScope && !concatenationScope.isWrapped()) return;
		const exportsInfo = moduleGraph.getExportsInfo(module);
		if (
			exportsInfo.getReadOnlyExportInfo("__esModule").getUsed(runtime) !==
			UsageState.Unused
		) {
			const content = runtimeTemplate.defineEsModuleFlagStatement({
				exportsArgument: module.exportsArgument,
				runtimeRequirements
			});

			const meta = moduleGraph.getMetaIfExisting(module);
			if (!concatenationScope && meta && meta.onDemandExports && getData) {
				const data = getData();
				const before = data.get("exportsSource");
				data.set("exportsSource", before ? `${before}${content}` : content);
			} else {
				initFragments.push(
					new InitFragment(
						content,
						InitFragment.STAGE_ESM_EXPORTS,
						0,
						"harmony compatibility"
					)
				);
			}
		}
		if (moduleGraph.isAsync(module)) {
			initFragments.push(createAsyncModuleInitFragment(templateContext));
		}
	}
};

/** @type {Set<keyof DependencyKinds>} */
ESMCompatibilityDependency.KINDS = new Set([
	...NullDependency.KINDS,
	"esm-compatibility"
]);

module.exports = ESMCompatibilityDependency;
