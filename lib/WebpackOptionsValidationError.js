"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Gajus Kuizinas @gajus
 */
/* eslint-disable no-case-declarations */
const webpackOptionsSchema = require("../schemas/webpackOptionsSchema.json");
class WebpackOptionsValidationError extends Error {
	constructor(validationErrors) {
		super();
		this.validationErrors = validationErrors;
		// this is because of Typescript's design limitation,
		// see https://github.com/Microsoft/TypeScript/wiki/What's-new-in-TypeScript#typescript-21
		Object.setPrototypeOf(this, WebpackOptionsValidationError.prototype);
		this.name = "WebpackOptionsValidationError";
		Error.captureStackTrace(this, WebpackOptionsValidationError);
		this.message = `Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema.\n${validationErrors.map(
			err => " - " + indent(WebpackOptionsValidationError.formatValidationError(err), "   ", false)).join("\n")}`;
	}

	static formatValidationError(err) {
		const dataPath = `configuration${err.dataPath}`;
		switch(err.keyword) {
			case "additionalProperties":
				const adpParams = err.params;
				const baseMessage = `${dataPath} has an unknown property '${adpParams.additionalProperty}'. These properties are valid:\n${getSchemaPartText(err.parentSchema)}`;
				if(!err.dataPath) {
					switch(adpParams.additionalProperty) {
						case "debug":
							return `${baseMessage}
The 'debug' property was removed in webpack 2.
Loaders should be updated to allow passing this option via loader options in module.rules.
Until loaders are updated one can use the LoaderOptionsPlugin to switch loaders into debug mode:
plugins: [
    new webpack.LoaderOptionsPlugin({
        debug: true
    })
]`;
					}
					return `${baseMessage}
For typos: please correct them.
For loader options: webpack 2 no longer allows custom properties in configuration.
  Loaders should be updated to allow passing options via loader options in module.rules.
  Until loaders are updated one can use the LoaderOptionsPlugin to pass these options to the loader:
  plugins: [
    new webpack.LoaderOptionsPlugin({
      // test: /\\.xxx$/, // may apply this only for some modules
      options: {
        ${adpParams.additionalProperty}: ...
      }
    })
  ]`;
				}
				return baseMessage;
			case "oneOf":
			case "anyOf":
				if(err.children && err.children.length > 0) {
					return `${dataPath} should be one of these:
${`${getSchemaPartText(err.parentSchema)}
Details:
${err.children.map(function(err) {
	return ` * ${indent(WebpackOptionsValidationError.formatValidationError(err), "   ", false)}`;
}).join("\n")}`}`;
				}
				return `${dataPath} should be one of these:\n${getSchemaPartText(err.parentSchema)}`;
			case "enum":
				if(err.parentSchema && err.parentSchema.enum && err.parentSchema.enum.length === 1) {
					return `${dataPath} should be ${getSchemaPartText(err.parentSchema)}`;
				}
				return `${dataPath} should be one of these:\n${getSchemaPartText(err.parentSchema)}`;
			case "allOf":
				return `${dataPath} should be:\n${getSchemaPartText(err.parentSchema)}`;
			case "type":
				const typeParams = err.params;
				switch(typeParams.type) {
					case "object":
						return `${dataPath} should be an object.`;
					case "string":
						return `${dataPath} should be a string.`;
					case "boolean":
						return `${dataPath} should be a boolean.`;
					case "number":
						return `${dataPath} should be a number.`;
					case "array":
						return `${dataPath} should be an array:\n${getSchemaPartText(err.parentSchema)}`;
				}
				return `${dataPath} should be ${typeParams.type}:\n${getSchemaPartText(err.parentSchema)}`;
			case "instanceof":
				return `${dataPath} should be an instance of ${getSchemaPartText(err.parentSchema)}.`;
			case "required":
				const missingProperty = err.params.missingProperty.replace(/^\./, "");
				return `${dataPath} misses the property '${missingProperty}'.\n${getSchemaPartText(err.parentSchema, [
					"properties",
					missingProperty
				])}`;
			case "minItems":
			case "minLength":
				if(err.params.limit === 1) {
					return `${dataPath} should not be empty.`;
				} else {
					return `${dataPath} ${err.message}`;
				}
			default:
				return `${dataPath} ${err.message} (${JSON.stringify(err, null, 2)}).\n${getSchemaPartText(err.parentSchema)}`;
		}
	}
}
WebpackOptionsValidationError.formatSchema = function formatSchema(schema, prevSchemas) {
	prevSchemas = prevSchemas || [];

	function formatInnerSchema(innerSchema, addSelf) {
		if(!addSelf) {
			return formatSchema(innerSchema, prevSchemas);
		}
		if(prevSchemas.indexOf(innerSchema) >= 0) {
			return "(recursive)";
		}
		return formatSchema(innerSchema, prevSchemas.concat(schema));
	}

	switch(schema.type) {
		case "string":
			if(schema.minLength === 1) {
				return "non-empty string";
			} else if(schema.minLength > 1) {
				return `string (min length ${schema.minLength})`;
			}
			return "string";
		case "boolean":
			return "boolean";
		case "number":
			return "number";
		case "object":
			if(schema.properties) {
				const required = schema.required || [];
				return `object { ${Object.keys(schema.properties).map(property => {
					if(required.indexOf(property) < 0) {
						return property + "?";
					}
					return property;
				}).concat(schema.additionalProperties ? ["..."] : []).join(", ")} }`;
			}
			if(schema.additionalProperties) {
				return `object { <key>: ${formatInnerSchema(schema.additionalProperties)} }`;
			}
			return "object";
		case "array":
			return `[${formatInnerSchema(schema.items)}]`;
	}
	switch(schema.instanceof) {
		case "Function":
			return "function";
		case "RegExp":
			return "RegExp";
	}
	if(schema.$ref) {
		return formatInnerSchema(getSchemaPart(schema.$ref), true);
	}
	if(schema.allOf) {
		return schema.allOf.map(formatInnerSchema).join(" & ");
	}
	if(schema.oneOf) {
		return schema.oneOf.map(formatInnerSchema).join(" | ");
	}
	if(schema.anyOf) {
		return schema.anyOf.map(formatInnerSchema).join(" | ");
	}
	if(schema.enum) {
		return schema.enum.map(item => JSON.stringify(item)).join(" | ");
	}
	return JSON.stringify(schema, null, 2);
};
function getSchemaPart(path, parents, additionalPath) {
	parents = parents || 0;
	let splitPath = path.split("/"), splitAddtionalPath;
	splitPath = splitPath.slice(0, splitPath.length - parents);
	if(additionalPath) {
		splitAddtionalPath = additionalPath.split("/");
		splitPath = splitPath.concat(splitAddtionalPath);
	}
	let schemaPart = webpackOptionsSchema;
	for(let i = 1; i < splitPath.length; i++) {
		const inner = schemaPart[splitPath[i]];
		if(inner) {
			schemaPart = inner;
		}
	}
	return schemaPart;
}
function getSchemaPartText(schemaPart, additionalPath) {
	if(additionalPath) {
		for(let i = 0; i < additionalPath.length; i++) {
			const inner = schemaPart[additionalPath[i]];
			if(inner) {
				schemaPart = inner;
			}
		}
	}
	while(schemaPart.$ref) {
		schemaPart = getSchemaPart(schemaPart.$ref);
	}
	let schemaText = WebpackOptionsValidationError.formatSchema(schemaPart);
	if(schemaPart.description) {
		schemaText += `\n${schemaPart.description}`;
	}
	return schemaText;
}
function indent(str, prefix, firstLine) {
	if(firstLine) {
		return prefix + str.replace(/\n(?!$)/g, "\n" + prefix);
	} else {
		return str.replace(/\n(?!$)/g, `\n${prefix}`);
	}
}
module.exports = WebpackOptionsValidationError;
