/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../NormalModule")} NormalModule */

/** @enum {number} */
const ImportMetaProperty = {
	Url: 0
};

class ImportMetaDependency extends NullDependency {
	/**
	 * @param {[number, number]} range range
	 * @param {ImportMetaProperty=} property import.meta property
	 */
	constructor(range, property) {
		super();
		this.range = range;
		this.property = property;
	}

	get type() {
		return "import.meta";
	}

	get category() {
		return "esm";
	}

	serialize({ write }) {
		write(this.range);
		write(this.property);
	}

	deserialize({ read }) {
		this.range = read();
		this.property = read();
	}
}

// makeSerializable(
// 	ImportMetaDependency,
// 	"webpack/lib/dependencies/ImportMetaDependency"
// );

ImportMetaDependency.Template = class ImportMetaDependencyTemplate extends NullDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const dep = /** @type {ImportMetaDependency} */ (dependency);
		const { module } = templateContext;

		if (dep.property === undefined) {
			const url = this.getUrl(module);

			return this.replace(source, dep.range, { url });
		}

		switch (dep.property) {
			case ImportMetaProperty.Url:
				return this.replace(source, dep.range, this.getUrl(module));
			default:
				return this.replace(source, dep.range, undefined);
		}
	}

	/**
	 * @param {Module} module current module
	 * @returns {string|undefined} import.meta.url
	 */
	getUrl(module) {
		const normalModule = /** @type {NormalModule} */ (module);

		if (!normalModule.resource) return undefined;

		return `file://${normalModule.resource}`;
	}

	/**
	 * @param {ReplaceSource} source source
	 * @param {[number, number]} range range
	 * @param {any} value value
	 * @returns {void}
	 */
	replace(source, range, value) {
		let val;
		switch (typeof value) {
			case "object":
				val = `(${JSON.stringify(value)})`;
				break;
			case "undefined":
				val = "undefined";
				break;
			default:
				val = JSON.stringify(value);
				break;
		}

		source.replace(range[0], range[1] - 1, val);
	}
};

ImportMetaDependency.ImportMetaProperty = ImportMetaProperty;

module.exports = ImportMetaDependency;
