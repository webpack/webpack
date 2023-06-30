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
/** @typedef {{name: string, range: Range}} Identifier */

class CSSModuleDefineDependency extends NullDependency {
	/**
	 * @param {Identifier[]} identifiers array of identifiers
	 * @param {Range} range range
	 * @param {number} blockNestingLevel block nesting level
	 * @param {CSSModuleDefineDependency | undefined} parentCssModule parent css module
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
	 * @param {[number, number]} range range
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
 * @param {string | boolean} omitUnderscore true if you need to omit underscore
 * @returns {string} escaped css identifier
 */
const escapeCssIdentifier = (str, omitUnderscore) => {
	const escaped = `${str}`.replace(
		// cspell:word uffff
		/[^a-zA-Z0-9_\u0081-\uffff-]/g,
		s => `\\${s}`
	);
	return !omitUnderscore && /^(?!--)[0-9-]/.test(escaped)
		? `_${escaped}`
		: escaped;
};

CSSModuleDefineDependency.Template = class CSSModuleDefineDependencyTemplate extends (
	NullDependency.Template
) {
	/**
	 *
	 * @param {CSSModuleDefineDependency} dependency dependency
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {boolean} true, if the dependency is used
	 */
	isModuleUsed(dependency, { module, moduleGraph, runtime }) {
		const identifiers = dependency.getIdentifiers();

		for (let i = 0; i < identifiers.length; i++) {
			const { name } = identifiers[i];

			const used = moduleGraph
				.getExportInfo(module, name)
				.getUsedName(name, runtime);

			// should add to output bundle if even one class is used
			if (used) {
				return true;
			}
		}
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
		const dep = /** @type {CSSModuleDefineDependency} */ (dependency);

		// check if all exports are unused
		const identifiers = dep.getIdentifiers();

		// check if any parent is unused
		let areAllParentsUsed = true;
		let parent = dep.getParentModule();
		while (parent) {
			if (!this.isModuleUsed(parent, templateContext)) {
				areAllParentsUsed = false;
				break;
			}
			parent = parent.getParentModule();
		}

		// if module is not used, or a parent is not used, remove the module
		if (!this.isModuleUsed(dep, templateContext) || !areAllParentsUsed) {
			source.replace(dep._range[0], dep._range[1] - 1, "");
			return;
		}

		for (let i = 0; i < identifiers.length; i++) {
			const { name, range: identifierRange } = identifiers[i];

			const used = moduleGraph
				.getExportInfo(module, name)
				.getUsedName(name, runtime);

			if (!used) {
				source.replace(identifierRange[0] - 1, identifierRange[1] - 1, "");
				continue;
			}

			// create a unique identifier and replace the original class name
			const moduleId = chunkGraph.getModuleId(module);

			const prefix = runtimeTemplate.outputOptions.uniqueName
				? runtimeTemplate.outputOptions.uniqueName + "-"
				: "";

			const uniqueName = moduleId + "-" + used;

			const identifier = prefix + uniqueName;

			const content = escapeCssIdentifier(identifier, true);

			source.replace(identifierRange[0], identifierRange[1] - 1, content);
			cssExports.set(used, identifier);
		}
	}
};

makeSerializable(
	CSSModuleDefineDependency,
	"webpack/lib/dependencies/CSSModuleDefineDependency"
);

module.exports = CSSModuleDefineDependency;
