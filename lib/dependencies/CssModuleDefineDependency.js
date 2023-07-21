/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Burhanuddin Udaipurwala @burhanuday
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */
/** @typedef {import("../DependencyTemplate").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../css/CssParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {{name: string, range: Range, isGlobal: boolean}} Identifier */

class CssModuleDefineDependency extends NullDependency {
	/**
	 * @param {Identifier[]} identifiers array of identifiers
	 * @param {Range} range range
	 * @param {number} blockNestingLevel block nesting level
	 * @param {CssModuleDefineDependency | undefined} parentCssModule parent css module
	 */
	constructor(identifiers, range, blockNestingLevel, parentCssModule) {
		super();
		this._identifiers = identifiers;
		this._range = range;
		this._blockNestingLevel = blockNestingLevel;
		this._parentCssModule = parentCssModule;
	}

	get type() {
		return "css module definition";
	}

	getIdentifiers() {
		return this._identifiers;
	}

	/**
	 * @param {Identifier} identifier identifier
	 */
	appendIdentifier(identifier) {
		this._identifiers.push(identifier);
	}

	/**
	 * @param {Range} range range
	 */
	setRange(range) {
		this._range = range;
	}

	getRange() {
		return this._range;
	}

	getBlockNestingLevel() {
		return this._blockNestingLevel;
	}

	getParentModule() {
		return this._parentCssModule;
	}

	/**
	 * Returns the exported names
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {ExportsSpec | undefined} export names
	 */
	getExports(moduleGraph) {
		const names = this._identifiers.map(identifier => identifier.name);
		return {
			exports: names.map(name => {
				return {
					name,
					canMangle: true
				};
			}),
			dependencies: undefined
		};
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this._identifiers);
		write(this._range);
		write(this._blockNestingLevel);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this._identifiers = read();
		this._range = read();
		this._blockNestingLevel = read();
		super.deserialize(context);
	}
}

/**
 * @param {string} str string
 * @returns {string} escaped css identifier
 */
const escapeCssIdentifier = str => {
	const escaped = `${str}`.replace(
		// cspell:word uffff
		/[^a-zA-Z0-9_\u0081-\uffff-]/g,
		s => `\\${s}`
	);
	return /^(?!--)[0-9-]/.test(escaped) ? `_${escaped}` : escaped;
};

CssModuleDefineDependency.Template = class CssModuleDefineDependencyTemplate extends (
	NullDependency.Template
) {
	/**
	 * Return true if any of the identifiers are used
	 * @param {CssModuleDefineDependency} dependency dependency
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {boolean} true, if the dependency is used
	 */
	static isStyleBlockUsed(dependency, { module, moduleGraph, runtime }) {
		const identifiers = dependency.getIdentifiers();

		for (let i = 0; i < identifiers.length; i++) {
			const { name, isGlobal } = identifiers[i];

			if (isGlobal) {
				return true;
			}

			const used = moduleGraph
				.getExportInfo(module, name)
				.getUsedName(name, runtime);

			// should add to output bundle if even one class name is used
			if (used) {
				return true;
			}
		}
		return false;
	}

	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const {
			module,
			moduleGraph,
			chunkGraph,
			runtime,
			runtimeTemplate,
			cssExports
		} = templateContext;
		const dep = /** @type {CssModuleDefineDependency} */ (dependency);

		const identifiers = dep.getIdentifiers();

		// check if any parent is unused
		// remove the style block if any ancestor is unused
		let areAllParentsUsed = true;
		let parent = dep.getParentModule();
		while (parent) {
			if (
				!CssModuleDefineDependencyTemplate.isStyleBlockUsed(
					parent,
					templateContext
				)
			) {
				areAllParentsUsed = false;
				break;
			}
			parent = parent.getParentModule();
		}

		if (!areAllParentsUsed) {
			return;
		}

		// if module is not used, or an ancestor is not used, remove the module
		if (
			!CssModuleDefineDependencyTemplate.isStyleBlockUsed(dep, templateContext)
		) {
			source.replace(dep._range[0], dep._range[1] - 1, "");
			return;
		}

		for (let i = 0; i < identifiers.length; i++) {
			const { name, range: identifierRange, isGlobal } = identifiers[i];

			if (isGlobal) {
				continue;
			}

			const used = moduleGraph
				.getExportInfo(module, name)
				.getUsedName(name, runtime);

			// if identifier is not used, continue to next identifier
			if (!used) {
				continue;
			}

			// create a unique identifier and replace the original class name
			const moduleId = chunkGraph.getModuleId(module);

			const prefix = runtimeTemplate.outputOptions.uniqueName
				? runtimeTemplate.outputOptions.uniqueName + "-"
				: "";

			const identifier = prefix + moduleId + "-" + used;

			const content = escapeCssIdentifier(identifier);

			source.replace(identifierRange[0], identifierRange[1] - 1, content);
			cssExports.set(used, identifier);
		}
	}
};

makeSerializable(
	CssModuleDefineDependency,
	"webpack/lib/dependencies/CssModuleDefineDependency"
);

module.exports = CssModuleDefineDependency;
