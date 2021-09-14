/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/

"use strict";

const DependencyTemplate = require("../DependencyTemplate");
const InitFragment = require("../InitFragment");
const makeSerializable = require("../util/makeSerializable");
const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../DependencyTemplates")} DependencyTemplates */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("../util/Hash")} Hash */

class CachedConstDependency extends NullDependency {
	/**
	 * @param {string} expression expression
	 * @param {number|[number, number]} range range
	 * @param {string} identifier identifier
	 * @param {InitFragment<GenerateContext>[]=} initFragments init fragments
	 */
	constructor(expression, range, identifier, initFragments) {
		super();

		this.expression = expression;
		this.range = range;
		this.identifier = identifier;
		this.initFragments = initFragments;
	}

	/**
	 * Update the hash
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		hash.update(`${this.identifier}`);
		hash.update(`${this.range}`);
		hash.update(`${this.expression}`);

		if (this.initFragments) {
			for (const fragment of this.initFragments)
				hash.update(`${fragment.key}_${fragment.position}`);
		}
	}

	serialize(context) {
		const { write } = context;

		write(this.expression);
		write(this.range);
		write(this.identifier);
		write(this.initFragments);

		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;

		this.expression = read();
		this.range = read();
		this.identifier = read();
		this.initFragments = read();

		super.deserialize(context);
	}
}

makeSerializable(
	CachedConstDependency,
	"webpack/lib/dependencies/CachedConstDependency"
);

CachedConstDependency.Template = class CachedConstDependencyTemplate extends (
	DependencyTemplate
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
		{ runtimeTemplate, dependencyTemplates, initFragments }
	) {
		const dep = /** @type {CachedConstDependency} */ (dependency);

		let position = 0;

		if (dep.initFragments && dep.initFragments.length > 0) {
			for (const fragment of dep.initFragments) {
				initFragments.push(fragment);
			}
			position = dep.initFragments[dep.initFragments.length - 1].position + 1;
		}

		initFragments.push(
			new InitFragment(
				`${runtimeTemplate.supportsConst() ? "const" : "var"} ${
					dep.identifier
				} = ${dep.expression};\n`,
				InitFragment.STAGE_CONSTANTS,
				position,
				`const ${dep.identifier}`
			)
		);

		if (typeof dep.range === "number") {
			source.insert(dep.range, dep.identifier);

			return;
		}

		source.replace(dep.range[0], dep.range[1] - 1, dep.identifier);
	}
};

module.exports = CachedConstDependency;
