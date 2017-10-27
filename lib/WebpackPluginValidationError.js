"use strict";

const WebpackError = require("./WebpackError");

const indent = require("./util/indent");
const getSchemaPartText = require("./util/getSchemaPartText");

const kebabCase = (str) => str.replace(/(\w|\s+)([A-Z])/g, (match, p1, p2) => p1.trim() + "-" + p2).toLowerCase();

class WebpackPluginValidationError extends WebpackError {
	constructor(validationErrors, pluginSchema) {
		super();

		this.name = "WebpackPluginValidationError";
		this.message =
			"Invalid plugin options. " + pluginSchema.id + " has been initialised using an invalid options argument.\n" +
			validationErrors.map(err => " - " + indent(WebpackPluginValidationError.formatValidationError(pluginSchema, err), "   ", false)).join("\n") +
			"\n\nMore info at: https://webpack.js.org/plugins/" + (pluginSchema.slug || kebabCase(pluginSchema.id));

		this.pluginSchema = pluginSchema;
		this.validationErrors = validationErrors;

		Error.captureStackTrace(this, this.constructor);
	}

	static formatValidationError(schema, err) {
		const dataPath = `options${err.dataPath}`;
		const getPluginSchemaPartText = (schemaPart, additionalPath) => getSchemaPartText(schema, schemaPart, additionalPath);

		if(err.keyword === "additionalProperties") {
			return `${dataPath} has an unknown property '${err.params.additionalProperty}'. These properties are valid:\n${getPluginSchemaPartText(err.parentSchema)}`;
		} else if(err.keyword === "oneOf" || err.keyword === "anyOf") {
			if(err.children && err.children.length > 0) {
				return `${dataPath} should be one of these:\n${getPluginSchemaPartText(err.parentSchema)}\n` +
					`Details:\n${err.children.map(err => " * " + indent(WebpackPluginValidationError.formatValidationError(schema, err), "   ", false)).join("\n")}`;
			}
			return `${dataPath} should be one of these:\n${getPluginSchemaPartText(err.parentSchema)}`;
		} else if(err.keyword === "enum") {
			if(err.parentSchema && err.parentSchema.enum && err.parentSchema.enum.length === 1) {
				return `${dataPath} should be ${getPluginSchemaPartText(err.parentSchema)}`;
			}
			return `${dataPath} should be one of these:\n${getPluginSchemaPartText(err.parentSchema)}`;
		} else if(err.keyword === "allOf") {
			return `${dataPath} should be:\n${getPluginSchemaPartText(err.parentSchema)}`;
		} else if(err.keyword === "type") {
			switch(err.params.type) {
				case "object":
					return `${dataPath} should be an object.`;
				case "string":
					return `${dataPath} should be a string.`;
				case "boolean":
					return `${dataPath} should be a boolean.`;
				case "number":
					return `${dataPath} should be a number.`;
				case "array":
					return `${dataPath} should be an array:\n${getPluginSchemaPartText(err.parentSchema)}`;
			}
			return `${dataPath} should be ${err.params.type}:\n${getPluginSchemaPartText(err.parentSchema)}`;
		} else if(err.keyword === "instanceof") {
			return `${dataPath} should be an instance of ${getPluginSchemaPartText(err.parentSchema)}.`;
		} else if(err.keyword === "required") {
			const missingProperty = err.params.missingProperty.replace(/^\./, "");
			return `${dataPath} misses the property '${missingProperty}'.\n${getPluginSchemaPartText(err.parentSchema, ["properties", missingProperty])}`;
		} else if(err.keyword === "minLength" || err.keyword === "minItems") {
			if(err.params.limit === 1) return `${dataPath} should not be empty.`;
			else return `${dataPath} ${err.message}`;
		} else if(err.keyword === "absolutePath") {
			return `${dataPath}: ${err.message}`;
		} else if(err.keyword === "minimum" || err.keyword === "maximum") {
			return `${dataPath} ${err.message}`;
		} else {
			// eslint-disable-line no-fallthrough
			return `${dataPath} ${err.message} (${JSON.stringify(err, 0, 2)}).\n${getPluginSchemaPartText(err.parentSchema)}`;
		}
	}
}

module.exports = WebpackPluginValidationError;
