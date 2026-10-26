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
 * @param {ValidationErrorConfiguration=} configuration name and data path of the errors, read from the schema title when not given
 * @param {PrecompiledCheck<T>=} check precompiled check of the schema
 * @param {ValidationErrorConfiguration=} defaults name and data path when neither the configuration nor the title gives them
 * @returns {void}
 */
const validateSchema = (schema, value, configuration, check, defaults) => {
	if (check && check(value)) return;

	const resolvedSchema = typeof schema === "function" ? schema() : schema;
	const resolvedConfiguration =
		configuration || getConfigurationFromTitle(resolvedSchema) || defaults;

	getValidate()(
		resolvedSchema,
		/** @type {EXPECTED_OBJECT | EXPECTED_OBJECT[]} */ (value),
		resolvedConfiguration
	);

	// The schema accepts what the check rejected, so the check is stale
	if (check) {
		require("util").deprecate(
			() => {},
			`${
				(resolvedConfiguration && resolvedConfiguration.name) || "A"
			} pre-compiled schema reports error while real schema is happy. This has performance drawbacks.`,
			"DEP_WEBPACK_PRE_COMPILED_SCHEMA_INVALID"
		)();
	}
};

module.exports = validateSchema;
