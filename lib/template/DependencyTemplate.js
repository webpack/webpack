/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @import { ReplaceSource } from "webpack-sources" */
/** @import ChunkGraph from "../graph/ChunkGraph.js" */
/** @import CodeGenerationResults from "../module/CodeGenerationResults.js" */
/** @import ConcatenationScope from "../optimize/ConcatenationScope.js" */
/** @import Dependency from "../graph/Dependency.js" */
/** @import DependencyTemplates from "./DependencyTemplates.js" */
/** @import { GenerateContext } from "../module/Generator.js" */
/** @import Module, { CodeGenerationResultData, RuntimeRequirements } from "../module/Module.js" */
/** @import ModuleGraph from "../graph/ModuleGraph.js" */
/** @import RuntimeTemplate from "./RuntimeTemplate.js" */
/** @import { RuntimeSpec } from "../util/runtime.js" */
/** @import InitFragment from "./InitFragment.js" */
/** @import { ChunkRenderContext } from "../javascript/JavascriptModulesPlugin.js" */

/**
 * Defines the dependency template context type used by this module.
 * @typedef {object} DependencyTemplateContext
 * @property {RuntimeTemplate} runtimeTemplate the runtime template
 * @property {DependencyTemplates} dependencyTemplates the dependency templates
 * @property {ModuleGraph} moduleGraph the module graph
 * @property {ChunkGraph} chunkGraph the chunk graph
 * @property {RuntimeRequirements} runtimeRequirements the requirements for runtime
 * @property {Module} module current module
 * @property {RuntimeSpec} runtime current runtimes, for which code is generated
 * @property {InitFragment<GenerateContext>[]} initFragments mutable array of init fragments for the current module
 * @property {ConcatenationScope=} concatenationScope when in a concatenated module, information about other concatenated modules
 * @property {CodeGenerationResults} codeGenerationResults the code generation results
 * @property {InitFragment<ChunkRenderContext>[]} chunkInitFragments init fragments for the chunk, rendered with its render context
 * @property {(() => CodeGenerationResultData)=} getData get access to the code generation data
 */

/**
 * Defines the css dependency template context extras type used by this module.
 * @typedef {object} CssDependencyTemplateContextExtras
 * @property {CssData} cssData the css exports data
 * @property {string} type the css exports data
 */

/**
 * Defines the css data type used by this module.
 * @typedef {object} CssData
 * @property {boolean} esModule whether export __esModule
 * @property {Map<string, string>} exports the css exports
 * @property {Map<string, string>=} locals what each class or id name of a CSS module becomes, keyed by its name in the source, for markup that names them (an HTML page's `class` and `id`)
 * @property {Map<string, { line: number, column: number }>=} exportLocs source position (line is 1-based, column is 0-based) of each export's defining identifier in the original CSS, used to emit fine-grained JS-to-CSS source mappings
 */

/** @typedef {DependencyTemplateContext & CssDependencyTemplateContextExtras} CssDependencyTemplateContext */

class DependencyTemplate {
	/* istanbul ignore next */
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @abstract
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const AbstractMethodError = require("../errors/AbstractMethodError");

		throw new AbstractMethodError();
	}
}

module.exports = DependencyTemplate;
