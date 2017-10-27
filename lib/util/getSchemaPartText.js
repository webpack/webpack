"use strict";

const formatSchema = require("./formatSchema");
const getSchemaPart = require("./getSchemaPart");

const getSchemaPartText = (rootSchema, schemaPart, additionalPath) => {
	if(additionalPath) {
		for(let i = 0; i < additionalPath.length; i++) {
			const inner = schemaPart[additionalPath[i]];
			if(inner)
				schemaPart = inner;
		}
	}
	while(schemaPart.$ref) schemaPart = getSchemaPart(rootSchema, schemaPart.$ref);
	let schemaText = formatSchema(rootSchema, schemaPart);
	if(schemaPart.description)
		schemaText += `\n${schemaPart.description}`;
	return schemaText;
};

module.exports = getSchemaPartText;
