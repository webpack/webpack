/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import { createRequire } from "node:module";

import Dependency from "../Dependency.js";
import DependencyTemplate from "../DependencyTemplate.js";
import makeSerializable from "../util/makeSerializable.js";
import memoize from "../util/memoize.js";

const require = createRequire(import.meta.url);
/** @typedef {import("../javascript/JavascriptParser.js").Range} Range */
/** @typedef {import("../ContextModule.js").ContextOptions} ContextOptions */
/** @typedef {import("../Dependency.js").TRANSITIVE} TRANSITIVE */
/** @typedef {import("../ModuleGraph.js").default} ModuleGraph */
/** @typedef {import("../errors/WebpackError.js").default} WebpackError */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectSerializerContext} ObjectSerializerContext */

const getCriticalDependencyWarning = memoize(
	() =>
		/** @type {typeof import("./CriticalDependencyWarning.js").default} */ (
			require("./CriticalDependencyWarning.js")
		)
);

/** @typedef {ContextOptions & { request: string }} ContextDependencyOptions */

/** @typedef {{ value: string, range: Range }[]} Replaces */

/**
 * Returns stringified regexp.
 * @param {RegExp | false | null | undefined} r regexp
 * @returns {string} stringified regexp
 */
const regExpToString = (r) => (r ? String(r) : "");

class ContextDependency extends Dependency {
	/**
	 * Creates an instance of ContextDependency.
	 * @param {ContextDependencyOptions} options options for the context module
	 * @param {string=} context request context
	 */
	constructor(options, context) {
		super();

		/** @type {ContextDependencyOptions} */
		this.options = options;
		/** @type {string} */
		this.userRequest = this.options && this.options.request;
		/** @type {false | undefined | string} */
		this.critical = false;
		/** @type {boolean} */
		this.hadGlobalOrStickyRegExp = false;

		if (
			this.options &&
			this.options.regExp &&
			(this.options.regExp.global || this.options.regExp.sticky)
		) {
			this.options = { ...this.options, regExp: null };
			this.hadGlobalOrStickyRegExp = true;
		}

		/** @type {string | undefined} */
		this.request = undefined;
		/** @type {Range | undefined} */
		this.range = undefined;
		/** @type {Range | undefined} */
		this.valueRange = undefined;
		/** @type {boolean | string | undefined} */
		this.inShorthand = undefined;
		/** @type {Replaces | undefined} */
		this.replaces = undefined;
		/** @type {string | undefined} */
		this._requestContext = context;
	}

	/**
	 * Returns a request context.
	 * @returns {string | undefined} a request context
	 */
	getContext() {
		return this._requestContext;
	}

	get category() {
		return "commonjs";
	}

	/**
	 * Could affect referencing module.
	 * @returns {boolean | TRANSITIVE} true, when changes to the referenced module could affect the referencing module; TRANSITIVE, when changes to the referenced module could affect referencing modules of the referencing module
	 */
	couldAffectReferencingModule() {
		return true;
	}

	/**
	 * Returns an identifier to merge equal requests.
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		return (
			`context${this._requestContext || ""}|ctx request${
				this.options.request
			} ${this.options.recursive} ` +
			`${regExpToString(this.options.regExp)} ${regExpToString(
				this.options.include
			)} ${regExpToString(this.options.exclude)} ` +
			`${this.options.mode} ${this.options.chunkName} ` +
			`${JSON.stringify(this.options.groupOptions)}` +
			`${
				this.options.referencedExports
					? ` ${JSON.stringify(this.options.referencedExports)}`
					: ""
			}`
		);
	}

	/**
	 * Returns warnings.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {WebpackError[] | null | undefined} warnings
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

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;

		write(this.options);
		write(this.userRequest);
		write(this.critical);
		write(this.hadGlobalOrStickyRegExp);
		write(this.request);
		write(this._requestContext);
		write(this.range);
		write(this.valueRange);
		write(this.replaces);

		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;

		this.options = read();
		this.userRequest = read();
		this.critical = read();
		this.hadGlobalOrStickyRegExp = read();
		this.request = read();
		this._requestContext = read();
		this.range = read();
		this.valueRange = read();
		this.replaces = read();

		super.deserialize(context);
	}
}

makeSerializable(
	ContextDependency,
	"webpack/lib/dependencies/ContextDependency"
);

ContextDependency.Template = DependencyTemplate;

export default ContextDependency;

export { ContextDependency as "module.exports" };
