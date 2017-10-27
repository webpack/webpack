"use strict";

const getSchemaPart = (schema, path, parents, additionalPath) => {
	parents = parents || 0;
	path = path.split("/");
	path = path.slice(0, path.length - parents);
	if(additionalPath) {
		additionalPath = additionalPath.split("/");
		path = path.concat(additionalPath);
	}
	let schemaPart = schema;
	for(let i = 1; i < path.length; i++) {
		const inner = schemaPart[path[i]];
		if(inner)
			schemaPart = inner;
	}
	return schemaPart;
};

module.exports = getSchemaPart;
