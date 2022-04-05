/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const InitFragment = require("../InitFragment");
const makeSerializable = require("../util/makeSerializable");
const CachedConstDependency = require("./CachedConstDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../javascript/JavascriptModulesPlugin").ChunkRenderContext} ChunkRenderContext */
/** @typedef {import("../util/Hash")} Hash */

class ExternalModuleDependency extends CachedConstDependency {
	constructor(module, imports, expression, range, identifier) {
		super(expression, range, identifier);

		if (imports.length === 0) throw new Error("Imports should be provided");
		this.importedModule = module;
		this.imports = imports;
	}

	/**
	 * Update the hash
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		if (!this._hashUpdate)
			this._hashUpdate = `${this.importedModule}${JSON.stringify(
				this.imports
			)}${this.identifier}${this.range}${this.expression}`;
		hash.update(this._hashUpdate);
	}

	serialize(context) {
		super.serialize(context);
		const { write } = context;
		write(this.importedModule);
		write(this.imports);
	}

	deserialize(context) {
		super.deserialize(context);
		const { read } = context;
		this.importedModule = read();
		this.imports = read();
	}
}

makeSerializable(
	ExternalModuleDependency,
	"webpack/lib/dependencies/ExternalModuleDependency"
);

ExternalModuleDependency.Template = class ExternalModuleDependencyTemplate extends (
	CachedConstDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		super.apply(dependency, source, templateContext);
		const dep = /** @type {ExternalModuleDependency} */ (dependency);
		const { chunkInitFragments } = templateContext;

		let importsString;
		const namedImports = [];

		for (const { name, value } of dep.imports) {
			if (name === "default") {
				importsString = value || dep.importedModule;
			} else {
				namedImports.push(value !== name ? `${name} as ${value}` : name);
			}
		}

		if (namedImports.length > 0) {
			const named = `{${namedImports.join(",")}}`;
			importsString = importsString ? `${importsString}, ${named}` : named;
		}

		importsString = `import ${importsString} from ${JSON.stringify(
			dep.importedModule
		)};`;

		chunkInitFragments.push(
			new InitFragment(
				importsString,
				InitFragment.STAGE_CONSTANTS,
				0,
				importsString
			)
		);
	}
};

module.exports = ExternalModuleDependency;
