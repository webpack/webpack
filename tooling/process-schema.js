/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const NESTED_WITH_NAME = ["definitions", "properties"];

const NESTED_DIRECT = ["items", "additionalProperties", "not"];

const NESTED_ARRAY = ["oneOf", "anyOf", "allOf"];

/**
 * A schema node holds arbitrary JSON, so its values have no narrower type.
 * @typedef {{ [key: string]: EXPECTED_ANY }} Schema
 */

/**
 * @typedef {object} Visitor
 * @property {((json: Schema, context: EXPECTED_ANY) => Schema)=} schema visits every schema node
 * @property {((json: Schema, context: EXPECTED_ANY) => Schema)=} object visits every keyed group of schemas
 * @property {((json: Schema[], context: EXPECTED_ANY) => void)=} array visits every combinator array
 */

/**
 * Walks a schema depth-first, handing each node to the visitor.
 * @param {Visitor} visitor the visitor to apply
 * @param {Schema} json the schema node to process
 * @param {EXPECTED_ANY=} context carried through to every visitor call
 * @returns {Schema} the processed node
 */
const processSchema = (visitor, json, context) => {
	json = { ...json };
	if (visitor.schema) json = visitor.schema(json, context);

	for (const name of NESTED_WITH_NAME) {
		if (name in json && json[name] && typeof json[name] === "object") {
			if (visitor.object) json[name] = visitor.object(json[name], context);
			for (const key in json[name]) {
				json[name][key] = processSchema(visitor, json[name][key], context);
			}
		}
	}
	for (const name of NESTED_DIRECT) {
		if (name in json && json[name] && typeof json[name] === "object") {
			json[name] = processSchema(visitor, json[name], context);
		}
	}
	for (const name of NESTED_ARRAY) {
		if (name in json && Array.isArray(json[name])) {
			json[name] = [...json[name]];
			for (let i = 0; i < json[name].length; i++) {
				json[name][i] = processSchema(visitor, json[name][i], context);
			}
			if (visitor.array) visitor.array(json[name], context);
		}
	}

	return json;
};

module.exports = processSchema;
