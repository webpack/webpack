/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ModuleFilenameHelpers = exports;

ModuleFilenameHelpers.ALL_LOADERS_RESOURCE = "[all-loaders][resource]";
ModuleFilenameHelpers.REGEXP_ALL_LOADERS_RESOURCE = /\[all-?loaders\]\[resource\]/gi;
ModuleFilenameHelpers.LOADERS_RESOURCE = "[loaders][resource]";
ModuleFilenameHelpers.REGEXP_LOADERS_RESOURCE = /\[loaders\]\[resource\]/gi;
ModuleFilenameHelpers.RESOURCE = "[resource]";
ModuleFilenameHelpers.REGEXP_RESOURCE = /\[resource\]/gi;
ModuleFilenameHelpers.ABSOLUTE_RESOURCE_PATH = "[absolute-resource-path]";
ModuleFilenameHelpers.REGEXP_ABSOLUTE_RESOURCE_PATH = /\[abs(olute)?-?resource-?path\]/gi;
ModuleFilenameHelpers.RESOURCE_PATH = "[resource-path]";
ModuleFilenameHelpers.REGEXP_RESOURCE_PATH = /\[resource-?path\]/gi;
ModuleFilenameHelpers.ALL_LOADERS = "[all-loaders]";
ModuleFilenameHelpers.REGEXP_ALL_LOADERS = /\[all-?loaders\]/gi;
ModuleFilenameHelpers.LOADERS = "[loaders]";
ModuleFilenameHelpers.REGEXP_LOADERS = /\[loaders\]/gi;
ModuleFilenameHelpers.QUERY = "[query]";
ModuleFilenameHelpers.REGEXP_QUERY = /\[query\]/gi;
ModuleFilenameHelpers.ID = "[id]";
ModuleFilenameHelpers.REGEXP_ID = /\[id\]/gi;
ModuleFilenameHelpers.HASH = "[hash]";
ModuleFilenameHelpers.REGEXP_HASH = /\[hash\]/gi;

function getAfter(str, token) {
	var idx = str.indexOf(token);
	return idx < 0 ? "" : str.substr(idx);
}

function getBefore(str, token) {
	var idx = str.lastIndexOf(token);
	return idx < 0 ? "" : str.substr(0, idx);
}

function getHash(str) {
	var hash = require("crypto").createHash("md5");
	hash.update(str);
	return hash.digest("hex").substr(0, 4);
}

function asRegExp(test) {
	if(typeof test === "string") test = new RegExp("^" + test.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));
	return test;
}

ModuleFilenameHelpers.createFilename = function createFilename(module, moduleFilenameTemplate, requestShortener) {
	if(!module) module = "";
	if(typeof module === "string") {
		var shortIdentifier = requestShortener.shorten(module);
		var identifier = shortIdentifier;
		var moduleId = "";
		var absoluteResourcePath = module.split("!").pop();
		var hash = getHash(identifier);
	} else {
		var shortIdentifier = module.readableIdentifier(requestShortener);
		var identifier = requestShortener.shorten(module.identifier());
		var moduleId = module.id;
		var absoluteResourcePath = module.resourcePath || module.identifier().split("!").pop();
		var hash = getHash(identifier);
	}
	var resource = shortIdentifier.split("!").pop();
	var loaders = getBefore(shortIdentifier, "!");
	var allLoaders = getBefore(identifier, "!");
	var query = getAfter(resource, "?");
	var resourcePath = resource.substr(0, resource.length - query.length);
	if(typeof moduleFilenameTemplate === "function") {
		return moduleFilenameTemplate({
			identifier: identifier,
			shortIdentifier: shortIdentifier,
			resource: resource,
			resourcePath: resourcePath,
			absoluteResourcePath: absoluteResourcePath,
			allLoaders: allLoaders,
			query: query,
			moduleId: moduleId,
			hash: hash
		});
	}
	return moduleFilenameTemplate
		.replace(ModuleFilenameHelpers.REGEXP_ALL_LOADERS_RESOURCE, identifier)
		.replace(ModuleFilenameHelpers.REGEXP_LOADERS_RESOURCE, shortIdentifier)
		.replace(ModuleFilenameHelpers.REGEXP_RESOURCE, resource)
		.replace(ModuleFilenameHelpers.REGEXP_RESOURCE_PATH, resourcePath)
		.replace(ModuleFilenameHelpers.REGEXP_ABSOLUTE_RESOURCE_PATH, absoluteResourcePath)
		.replace(ModuleFilenameHelpers.REGEXP_ALL_LOADERS, allLoaders)
		.replace(ModuleFilenameHelpers.REGEXP_LOADERS, loaders)
		.replace(ModuleFilenameHelpers.REGEXP_QUERY, query)
		.replace(ModuleFilenameHelpers.REGEXP_ID, moduleId)
		.replace(ModuleFilenameHelpers.REGEXP_HASH, hash);
};

ModuleFilenameHelpers.createFooter = function createFooter(module, requestShortener) {
	if(typeof module === "string") {
		return [
			"/** WEBPACK FOOTER **",
			" ** " + requestShortener.shorten(module),
			" **/"
		].join("\n");
	} else {
		return [
			"/*****************",
			" ** WEBPACK FOOTER",
			" ** " + module.readableIdentifier(requestShortener),
			" ** module id = " + module.id,
			" ** module chunks = " + module.chunks.map(function(c) {
				return c.id;
			}).join(" "),
			" **/"
		].join("\n");
	}
};

ModuleFilenameHelpers.replaceDuplicates = function replaceDuplicates(array, fn, comparator) {
	var countMap = {};
	var posMap = {};
	array.forEach(function(item, idx) {
		countMap[item] = (countMap[item] || []);
		countMap[item].push(idx);
		posMap[item] = 0;
	});
	if(comparator) {
		Object.keys(countMap).forEach(function(item) {
			countMap[item].sort(comparator);
		});
	}
	return array.map(function(item, i) {
		if(countMap[item].length > 1) {
			if(comparator && countMap[item][0] === i)
				return item;
			return fn(item, i, posMap[item]++);
		} else return item;
	});
};

ModuleFilenameHelpers.matchPart = function matchPart(str, test) {
	if(!test) return true;
	test = asRegExp(test);
	if(Array.isArray(test)) {
		return test.map(asRegExp).filter(function(regExp) {
			return regExp.test(str);
		}).length > 0;
	} else {
		return test.test(str);
	}
};

ModuleFilenameHelpers.matchObject = function matchObject(obj, str) {
	if(obj.test)
		if(!ModuleFilenameHelpers.matchPart(str, obj.test)) return false;
	if(obj.include)
		if(!ModuleFilenameHelpers.matchPart(str, obj.include)) return false;
	if(obj.exclude)
		if(ModuleFilenameHelpers.matchPart(str, obj.exclude)) return false;
	return true;
};
