/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../Dependency");
const DependencyTemplate = require("../DependencyTemplate");
const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");

/** @typedef {import("../ContextModule").ContextOptions} ContextOptions */
/** @typedef {import("../Dependency").TRANSITIVE} TRANSITIVE */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../WebpackError")} WebpackError */

const getCriticalDependencyWarning = memoize(() =>
	require("./CriticalDependencyWarning")
);

/** @typedef {ContextOptions & { request: string }} ContextDependencyOptions */

const regExpToString = r => (r ? r + "" : "");

class ContextDependency extends Dependency {
	/**
	 * @param {ContextDependencyOptions} options options for the context module
	 */
	constructor(options) {
		super();

		this.options = options;
		this.userRequest = this.options && this.options.request;
		/** @type {false | string} */
		this.critical = false;
		this.hadGlobalOrStickyRegExp = false;

		if (
			this.options &&
			(this.options.regExp.global || this.options.regExp.sticky)
		) {
			this.options = { ...this.options, regExp: null };
			this.hadGlobalOrStickyRegExp = true;
		}

		this.request = undefined;
		this.range = undefined;
		this.valueRange = undefined;
		// TODO refactor this
		this.replaces = undefined;
	}

	get category() {
		return "commonjs";
	}

	/**
	 * @returns {boolean | TRANSITIVE} true, when changes to the referenced module could affect the referencing module; TRANSITIVE, when changes to the referenced module could affect referencing modules of the referencing module
	 */
	couldAffectReferencingModule() {
		return true;
	}

	/**
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		return (
			`context${this.options.request} ${this.options.recursive} ` +
			`${regExpToString(this.options.regExp)} ${regExpToString(
				this.options.include
			)} ${regExpToString(this.options.exclude)} ` +
			`${this.options.mode} ${this.options.chunkName} ` +
			`${JSON.stringify(this.options.groupOptions)}`
		);
	}

	/**
	 * Returns warnings
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {WebpackError[]} warnings
	 */
	getWarnings(moduleGraph) {
		let warnings = super.getWarnings(moduleGraph);

		if (this.critical) {
			if (!warnings) warnings = [];
			const CriticalDependencyWarning = getCriticalDependencyWarning();
			warnings.push(new CriticalDependencyWarning(this.critical));
		}

		if (this.hadGlobalOrStickyRegExp) {
			if (!warnings) warnings = [];
			const CriticalDependencyWarning = getCriticalDependencyWarning();
			warnings.push(
				new CriticalDependencyWarning(
					"Contexts can't use RegExps with the 'g' or 'y' flags."
				)
			);
		}

		return warnings;
	}

	serialize(context) {
		const { write } = context;

		write(this.options);
		write(this.userRequest);
		write(this.critical);
		write(this.hadGlobalOrStickyRegExp);
		write(this.request);
		write(this.range);
		write(this.valueRange);
		write(this.prepend);
		write(this.replaces);

		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;

		this.options = read();
		this.userRequest = read();
		this.critical = read();
		this.hadGlobalOrStickyRegExp = read();
		this.request = read();
		this.range = read();
		this.valueRange = read();
		this.prepend = read();
		this.replaces = read();

		super.deserialize(context);
	}
}

makeSerializable(
	ContextDependency,
	"webpack/lib/dependencies/ContextDependency"
);

ContextDependency.Template = DependencyTemplate;

module.exports = ContextDependency;
