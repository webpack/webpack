"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const crypto = require("crypto");
exports.ALL_LOADERS_RESOURCE = "[all-loaders][resource]";
exports.REGEXP_ALL_LOADERS_RESOURCE = /\[all-?loaders\]\[resource\]/gi;
exports.LOADERS_RESOURCE = "[loaders][resource]";
exports.REGEXP_LOADERS_RESOURCE = /\[loaders\]\[resource\]/gi;
exports.RESOURCE = "[resource]";
exports.REGEXP_RESOURCE = /\[resource\]/gi;
exports.ABSOLUTE_RESOURCE_PATH = "[absolute-resource-path]";
exports.REGEXP_ABSOLUTE_RESOURCE_PATH = /\[abs(olute)?-?resource-?path\]/gi;
exports.RESOURCE_PATH = "[resource-path]";
exports.REGEXP_RESOURCE_PATH = /\[resource-?path\]/gi;
exports.ALL_LOADERS = "[all-loaders]";
exports.REGEXP_ALL_LOADERS = /\[all-?loaders\]/gi;
exports.LOADERS = "[loaders]";
exports.REGEXP_LOADERS = /\[loaders\]/gi;
exports.QUERY = "[query]";
exports.REGEXP_QUERY = /\[query\]/gi;
exports.ID = "[id]";
exports.REGEXP_ID = /\[id\]/gi;
exports.HASH = "[hash]";
exports.REGEXP_HASH = /\[hash\]/gi;
function getAfter(str, token) {
	const idx = str.indexOf(token);
	return idx < 0 ? "" : str.substr(idx);
}
function getBefore(str, token) {
	const idx = str.lastIndexOf(token);
	return idx < 0 ? "" : str.substr(0, idx);
}
function getHash(str) {
	const hash = crypto.createHash("md5");
	hash.update(str);
	return hash.digest("hex").substr(0, 4);
}
// todo does not check if not RegExp
function asRegExp(test) {
	if(typeof test === "string") {
		return new RegExp(`^${test.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}`);
	}
	return test;
}
function createFilename(module, moduleFilenameTemplate, requestShortener) {
	let absoluteResourcePath;
	let hash;
	let identifier;
	let moduleId;
	let shortIdentifier;
	if(!module) {
		module = "";
	}
	if(typeof module === "string") {
		shortIdentifier = requestShortener.shorten(module);
		identifier = shortIdentifier;
		moduleId = "";
		absoluteResourcePath = module.split("!").pop();
		hash = getHash(identifier);
	} else {
		shortIdentifier = module.readableIdentifier(requestShortener);
		identifier = requestShortener.shorten(module.identifier());
		moduleId = module.id;
		// todo: no resourcePath on module
		absoluteResourcePath = module.resourcePath || module.identifier().split("!").pop();
		hash = getHash(identifier);
	}
	const resource = shortIdentifier.split("!").pop();
	const loaders = getBefore(shortIdentifier, "!");
	const allLoaders = getBefore(identifier, "!");
	const query = getAfter(resource, "?");
	const resourcePath = resource.substr(0, resource.length - query.length);
	if(typeof moduleFilenameTemplate === "function") {
		return moduleFilenameTemplate({
			identifier,
			shortIdentifier,
			resource,
			resourcePath,
			absoluteResourcePath,
			allLoaders,
			query,
			moduleId,
			hash
		});
	}
	return moduleFilenameTemplate
		.replace(exports.REGEXP_ALL_LOADERS_RESOURCE, identifier)
		.replace(exports.REGEXP_LOADERS_RESOURCE, shortIdentifier)
		.replace(exports.REGEXP_RESOURCE, resource)
		.replace(exports.REGEXP_RESOURCE_PATH, resourcePath)
		.replace(exports.REGEXP_ABSOLUTE_RESOURCE_PATH, absoluteResourcePath)
		.replace(exports.REGEXP_ALL_LOADERS, allLoaders)
		.replace(exports.REGEXP_LOADERS, loaders)
		.replace(exports.REGEXP_QUERY, query)
		.replace(exports.REGEXP_ID, moduleId)
		.replace(exports.REGEXP_HASH, hash);
}
exports.createFilename = createFilename;
function createFooter(module, requestShortener) {
	if(!module) {
		module = "";
	}
	if(typeof module === "string") {
		return ["// WEBPACK FOOTER //", `// ${requestShortener.shorten(module)}`].join("\n");
	} else {
		return [
			"//////////////////", "// WEBPACK FOOTER", `// ${module.readableIdentifier(requestShortener)}`,
			`// module id = ${module.id}`, `// module chunks = ${module.chunks.map(chunk => chunk.id).join(" ")}`
		].join("\n");
	}
}
exports.createFooter = createFooter;
function replaceDuplicates(array, fn, comparator) {
	const countMap = {};
	const posMap = {};
	array.forEach((item, idx) => {
		countMap[item] = countMap[item] || [];
		countMap[item].push(idx);
		posMap[item] = 0;
	});
	if(comparator) {
		Object.keys(countMap).forEach(item => {
			countMap[item].sort(comparator);
		});
	}
	return array.map((item, i) => {
		if(countMap[item].length > 1) {
			if(comparator && countMap[item][0] === i) {
				return item;
			}
			return fn(item, i, posMap[item]++);
		} else {
			return item;
		}
	});
}
exports.replaceDuplicates = replaceDuplicates;
function matchPart(str, test) {
	if(!test) {
		return true;
	}
	if(Array.isArray(test)) {
		return test.map(asRegExp).filter((regExp) => regExp.test(str)).length > 0;
	} else {
		const testReg = asRegExp(test);
		return testReg.test(str);
	}
}
exports.matchPart = matchPart;
function matchObject(obj, str) {
	if(obj.test) {
		if(!matchPart(str, obj.test)) {
			return false;
		}
	}
	if(obj.include) {
		if(!matchPart(str, obj.include)) {
			return false;
		}
	}
	if(obj.exclude) {
		if(matchPart(str, obj.exclude)) {
			return false;
		}
	}
	return true;
}
exports.matchObject = matchObject;
