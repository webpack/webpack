/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Gajus Kuizinas @gajus
*/
"use strict";

const WebpackError = require("./WebpackError");
const webpackOptionsSchema = require("../schemas/webpackOptionsSchema.json");

const indent = require("./util/indent");
const getSchemaPartText = require("./util/getSchemaPartText");

const getOptionsSchemaPartText = (schema, additionalPath) =>
	getSchemaPartText(webpackOptionsSchema, schema, additionalPath);

class WebpackOptionsValidationError extends WebpackError {
	constructor(validationErrors) {
		super();

		this.name = "WebpackOptionsValidationError";
		this.message = "Invalid configuration object. " +
			"Webpack has been initialised using a configuration object that does not match the API schema.\n" +
			validationErrors.map(err => " - " + indent(WebpackOptionsValidationError.formatValidationError(err), "   ", false)).join("\n");
		this.validationErrors = validationErrors;

		Error.captureStackTrace(this, this.constructor);
	}

	static formatValidationError(err) {
		const dataPath = `configuration${err.dataPath}`;
		if(err.keyword === "additionalProperties") {
			const baseMessage = `${dataPath} has an unknown property '${err.params.additionalProperty}'. These properties are valid:\n${getOptionsSchemaPartText(err.parentSchema)}`;
			if(!err.dataPath) {
				switch(err.params.additionalProperty) {
					case "debug":
						return `${baseMessage}\n` +
							"The 'debug' property was removed in webpack 2.\n" +
							"Loaders should be updated to allow passing this option via loader options in module.rules.\n" +
							"Until loaders are updated one can use the LoaderOptionsPlugin to switch loaders into debug mode:\n" +
							"plugins: [\n" +
							"  new webpack.LoaderOptionsPlugin({\n" +
							"    debug: true\n" +
							"  })\n" +
							"]";
				}
				return baseMessage + "\n" +
					"For typos: please correct them.\n" +
					"For loader options: webpack 2 no longer allows custom properties in configuration.\n" +
					"  Loaders should be updated to allow passing options via loader options in module.rules.\n" +
					"  Until loaders are updated one can use the LoaderOptionsPlugin to pass these options to the loader:\n" +
					"  plugins: [\n" +
					"    new webpack.LoaderOptionsPlugin({\n" +
					"      // test: /\\.xxx$/, // may apply this only for some modules\n" +
					"      options: {\n" +
					`        ${err.params.additionalProperty}: ...\n` +
					"      }\n" +
					"    })\n" +
					"  ]";
			}
			return baseMessage;
		} else if(err.keyword === "oneOf" || err.keyword === "anyOf") {
			if(err.children && err.children.length > 0) {
				return `${dataPath} should be one of these:\n${getOptionsSchemaPartText(err.parentSchema)}\n` +
					`Details:\n${err.children.map(err => " * " + indent(WebpackOptionsValidationError.formatValidationError(err), "   ", false)).join("\n")}`;
			}
			return `${dataPath} should be one of these:\n${getOptionsSchemaPartText(err.parentSchema)}`;

		} else if(err.keyword === "enum") {
			if(err.parentSchema && err.parentSchema.enum && err.parentSchema.enum.length === 1) {
				return `${dataPath} should be ${getOptionsSchemaPartText(err.parentSchema)}`;
			}
			return `${dataPath} should be one of these:\n${getOptionsSchemaPartText(err.parentSchema)}`;
		} else if(err.keyword === "allOf") {
			return `${dataPath} should be:\n${getOptionsSchemaPartText(err.parentSchema)}`;
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
					return `${dataPath} should be an array:\n${getOptionsSchemaPartText(err.parentSchema)}`;
			}
			return `${dataPath} should be ${err.params.type}:\n${getOptionsSchemaPartText(err.parentSchema)}`;
		} else if(err.keyword === "instanceof") {
			return `${dataPath} should be an instance of ${getOptionsSchemaPartText(err.parentSchema)}.`;
		} else if(err.keyword === "required") {
			const missingProperty = err.params.missingProperty.replace(/^\./, "");
			return `${dataPath} misses the property '${missingProperty}'.\n${getOptionsSchemaPartText(err.parentSchema, ["properties", missingProperty])}`;
		} else if(err.keyword === "minLength" || err.keyword === "minItems") {
			if(err.params.limit === 1)
				return `${dataPath} should not be empty.`;
			else
				return `${dataPath} ${err.message}`;
		} else if(err.keyword === "absolutePath") {
			const baseMessage = `${dataPath}: ${err.message}`;
			if(dataPath === "configuration.output.filename") {
				return `${baseMessage}\n` +
					"Please use output.path to specify absolute path and output.filename for the file name.";
			}
			return baseMessage;
		} else {
			// eslint-disable-line no-fallthrough
			return `${dataPath} ${err.message} (${JSON.stringify(err, 0, 2)}).\n${getOptionsSchemaPartText(err.parentSchema)}`;
		}
	}
}

module.exports = WebpackOptionsValidationError;
