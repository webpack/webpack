/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const memoize = require("./memoize");

const getValidate = memoize(() => require("schema-utils").validate);

/** @import { Schema, ValidationErrorConfiguration } from "schema-utils" */

/**
 * A check precompiled from a schema with `schema-utils precompile`, it only
 * says whether the value is valid
 * @template [T=EXPECTED_ANY]
 * @typedef {(value: T) => boolean} PrecompiledCheck
 */

/**
 * Reads the name and data path from a schema titled `"<name> <baseDataPath>"`,
 * e.g. `"Css Loader options"`
 * @param {Schema} schema schema
 * @returns {ValidationErrorConfiguration | undefined} name and data path when the title gives them
 */
const getConfigurationFromTitle = (schema) => {
	const match =
		typeof schema.title === "string" && /^(.+) (.+)$/.exec(schema.title);

	return match ? { name: match[1], baseDataPath: match[2] } : undefined;
};

/**
 * Validates a value against a schema. A precompiled check that passes skips
 * the schema, so valid values never load `schema-utils` or compile it.
 * @template T
 * @param {Schema | (() => Schema)} schema schema, or a function returning it so a valid value never reads it
 * @param {T} value value
 * @param {(ValidationErrorConfiguration | PrecompiledCheck<T>)=} configurationOrCheck name and data path of the errors, `schema-utils` reads a schema titled `"<name> <baseDataPath>"` for what is not given; a check in its place is the check
 * @param {PrecompiledCheck<T>=} precompiledCheck precompiled check of the schema
 * @param {ValidationErrorConfiguration=} defaults name and data path in place of the schema title's, when it gives none
 * @returns {void}
 */
const validateSchema = (
	schema,
	value,
	configurationOrCheck,
	precompiledCheck,
	defaults
) => {
	// A configuration is an object and a check a function, so the check can
	// come last or in the configuration's place when there is no configuration
	const check =
		typeof configurationOrCheck === "function"
			? configurationOrCheck
			: precompiledCheck;
	const configuration =
		typeof configurationOrCheck === "function"
			? undefined
			: configurationOrCheck;

	if (check && check(value)) return;

	const resolvedSchema = typeof schema === "function" ? schema() : schema;
	const title = getConfigurationFromTitle(resolvedSchema);
	// `schema-utils` reads the title only for what neither gives, so defaults
	// that a title would override come in only without one
	const resolvedConfiguration = defaults
		? { ...(title || defaults), ...configuration }
		: configuration;

	getValidate()(
		resolvedSchema,
		/** @type {EXPECTED_OBJECT | EXPECTED_OBJECT[]} */ (value),
		resolvedConfiguration
	);

	// The schema accepts what the check rejected, so the check is stale
	if (check) {
		const name =
			(resolvedConfiguration && resolvedConfiguration.name) ||
			(title && title.name) ||
			"A";

		require("util").deprecate(
			() => {},
			`${name} pre-compiled schema reports error while real schema is happy. This has performance drawbacks.`,
			"DEP_WEBPACK_PRE_COMPILED_SCHEMA_INVALID"
		)();
	}
};

module.exports = validateSchema;
