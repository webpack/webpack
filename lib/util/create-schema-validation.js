/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const memoize = require("./memoize");

/** @typedef {import("schema-utils").validate} Validate */
/** @typedef {import("schema-utils").Schema} Schema */
/** @typedef {import("schema-utils").ValidationErrorConfiguration} ValidationErrorConfiguration */

const getValidate = memoize(() => require("schema-utils").validate);

/**
 * @template {object | object[]} T
 * @param {((value: T) => boolean) | undefined} check check
 * @param {() => Schema} getSchema get schema fn
 * @param {ValidationErrorConfiguration} options options
 * @returns {(value?: T) => void} validate
 */
const createSchemaValidation = (check, getSchema, options) => {
	getSchema = memoize(getSchema);
	return (value) => {
		if (check && value && !check(value)) {
			getValidate()(
				getSchema(),
				/** @type {EXPECTED_OBJECT | EXPECTED_OBJECT[]} */
				(value),
				options
			);
			require("util").deprecate(
				() => {},
				"webpack bug: Pre-compiled schema reports error while real schema is happy. This has performance drawbacks.",
				"DEP_WEBPACK_PRE_COMPILED_SCHEMA_INVALID"
			)();
		}
	};
};

/**
 * @template {object | object[]} T
 * @param {T} value value
 * @param {((value: T) => boolean) | undefined} check check
 * @param {Schema} schema fn
 * @param {Validate=} validate validate fn
 * @param {ValidationErrorConfiguration=} options options
 */
const schemaValidation = (value, check, schema, validate, options) => {
	if (check && value && !check(value)) {
		const validateFn = validate || getValidate();
		validateFn(
			schema,
			/** @type {EXPECTED_OBJECT | EXPECTED_OBJECT[]} */ (value),
			options
		);
	}
};

module.exports = createSchemaValidation;
module.exports.schemaValidation = schemaValidation;
