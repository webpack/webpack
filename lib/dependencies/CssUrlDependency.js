/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../ModuleGraphConnection")} ModuleGraphConnection */
/** @typedef {import("../ModuleGraphConnection").ConnectionState} ConnectionState */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

const getRawDataUrlModule = memoize(() => require("../asset/RawDataUrlModule"));

class CssUrlDependency extends ModuleDependency {
	/**
	 * @param {string} request request
	 * @param {[number, number]} range range of the argument
	 * @param {string} cssFunctionKind kind of css function, e. g. url(), image()
	 */
	constructor(request, range, cssFunctionKind) {
		super(request);
		this.range = range;
		this.cssFunctionKind = cssFunctionKind;
	}

	get type() {
		return "css url()";
	}

	get category() {
		return "url";
	}

	/**
	 * @param {string} context context directory
	 * @returns {Module} a module
	 */
	createIgnoredModule(context) {
		const RawDataUrlModule = getRawDataUrlModule();
		return new RawDataUrlModule("data:,", `ignored-asset`, `(ignored asset)`);
	}

	serialize(context) {
		const { write } = context;
		write(this.cssFunctionKind);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this.cssFunctionKind = read();
		super.deserialize(context);
	}
}

const cssEscapeString = str => {
	let countWhiteOrBracket = 0;
	let countQuotation = 0;
	let countApostrophe = 0;
	for (let i = 0; i < str.length; i++) {
		const cc = str.charCodeAt(i);
		switch (cc) {
			case 9: // tab
			case 10: // nl
			case 32: // space
			case 40: // (
			case 41: // )
				countWhiteOrBracket++;
				break;
			case 34:
				countQuotation++;
				break;
			case 39:
				countApostrophe++;
				break;
		}
	}
	if (countWhiteOrBracket < 2) {
		return str.replace(/[\n\t ()'"\\]/g, m => `\\${m}`);
	} else if (countQuotation <= countApostrophe) {
		return `"${str.replace(/[\n"\\]/g, m => `\\${m}`)}"`;
	} else {
		return `'${str.replace(/[\n'\\]/g, m => `\\${m}`)}'`;
	}
};

CssUrlDependency.Template = class CssUrlDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(
		dependency,
		source,
		{ runtime, moduleGraph, runtimeTemplate, codeGenerationResults }
	) {
		const dep = /** @type {CssUrlDependency} */ (dependency);

		source.replace(
			dep.range[0],
			dep.range[1] - 1,
			`${dep.cssFunctionKind}(${cssEscapeString(
				runtimeTemplate.assetUrl({
					publicPath: "",
					runtime,
					module: moduleGraph.getModule(dep),
					codeGenerationResults
				})
			)})`
		);
	}
};

makeSerializable(CssUrlDependency, "webpack/lib/dependencies/CssUrlDependency");

module.exports = CssUrlDependency;
