"use strict";

const getSchemaPart = require("./getSchemaPart");

const formatSchema = (rootSchema, schema, prevSchemas) => {
	prevSchemas = prevSchemas || [];

	const formatInnerSchema = (innerSchema, addSelf) => {
		if(!addSelf) return formatSchema(rootSchema, innerSchema, prevSchemas);
		if(prevSchemas.indexOf(innerSchema) >= 0) return "(recursive)";
		return formatSchema(rootSchema, innerSchema, prevSchemas.concat(schema));
	};

	if(schema.type === "string") {
		if(schema.minLength === 1)
			return "non-empty string";
		else if(schema.minLength > 1)
			return `string (min length ${schema.minLength})`;
		return "string";
	} else if(schema.type === "boolean") {
		return "boolean";
	} else if(schema.type === "number") {
		return "number";
	} else if(schema.type === "object") {
		if(schema.properties) {
			const required = schema.required || [];
			return `object { ${Object.keys(schema.properties).map(property => {
				if(required.indexOf(property) < 0) return property + "?";
				return property;
			}).concat(schema.additionalProperties ? ["..."] : []).join(", ")} }`;
		}
		if(schema.additionalProperties) {
			return `object { <key>: ${formatInnerSchema(schema.additionalProperties)} }`;
		}
		return "object";
	} else if(schema.type === "array") {
		return `[${formatInnerSchema(schema.items)}]`;
	}

	switch(schema.instanceof) {
		case "Function":
			return "function";
		case "RegExp":
			return "RegExp";
	}
	if(schema.$ref) return formatInnerSchema(getSchemaPart(rootSchema, schema.$ref), true);
	if(schema.allOf) return schema.allOf.map(formatInnerSchema).join(" & ");
	if(schema.oneOf) return schema.oneOf.map(formatInnerSchema).join(" | ");
	if(schema.anyOf) return schema.anyOf.map(formatInnerSchema).join(" | ");
	if(schema.enum) return schema.enum.map(item => JSON.stringify(item)).join(" | ");
	return JSON.stringify(schema, 0, 2);
};

module.exports = formatSchema;
