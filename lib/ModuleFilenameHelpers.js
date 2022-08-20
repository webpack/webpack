/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const NormalModule = require("./NormalModule");
const createHash = require("./util/createHash");
const memoize = require("./util/memoize");

/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./RequestShortener")} RequestShortener */
/** @typedef {typeof import("./util/Hash")} Hash */

const ModuleFilenameHelpers = exports;

// TODO webpack 6: consider removing these
ModuleFilenameHelpers.ALL_LOADERS_RESOURCE = "[all-loaders][resource]";
ModuleFilenameHelpers.REGEXP_ALL_LOADERS_RESOURCE =
	/\[all-?loaders\]\[resource\]/gi;
ModuleFilenameHelpers.LOADERS_RESOURCE = "[loaders][resource]";
ModuleFilenameHelpers.REGEXP_LOADERS_RESOURCE = /\[loaders\]\[resource\]/gi;
ModuleFilenameHelpers.RESOURCE = "[resource]";
ModuleFilenameHelpers.REGEXP_RESOURCE = /\[resource\]/gi;
ModuleFilenameHelpers.ABSOLUTE_RESOURCE_PATH = "[absolute-resource-path]";
// cSpell:words olute
ModuleFilenameHelpers.REGEXP_ABSOLUTE_RESOURCE_PATH =
	/\[abs(olute)?-?resource-?path\]/gi;
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
ModuleFilenameHelpers.NAMESPACE = "[namespace]";
ModuleFilenameHelpers.REGEXP_NAMESPACE = /\[namespace\]/gi;

const getAfter = (strFn, token) => {
	return () => {
		const str = strFn();
		const idx = str.indexOf(token);
		return idx < 0 ? "" : str.slice(idx);
	};
};

const getBefore = (strFn, token) => {
	return () => {
		const str = strFn();
		const idx = str.lastIndexOf(token);
		return idx < 0 ? "" : str.slice(0, idx);
	};
};

const getHash = (strFn, hashFunction) => {
	return () => {
		const hash = createHash(hashFunction);
		hash.update(strFn());
		const digest = /** @type {string} */ (hash.digest("hex"));
		return digest.slice(0, 4);
	};
};

const asRegExp = test => {
	if (typeof test === "string") {
		test = new RegExp("^" + test.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));
	}
	return test;
};

const lazyObject = obj => {
	const newObj = {};
	for (const key of Object.keys(obj)) {
		const fn = obj[key];
		Object.defineProperty(newObj, key, {
			get: () => fn(),
			set: v => {
				Object.defineProperty(newObj, key, {
					value: v,
					enumerable: true,
					writable: true
				});
			},
			enumerable: true,
			configurable: true
		});
	}
	return newObj;
};

const REGEXP = /\[\\*([\w-]+)\\*\]/gi;

/**
 *
 * @param {Module | string} module the module
 * @param {TODO} options options
 * @param {Object} contextInfo context info
 * @param {RequestShortener} contextInfo.requestShortener requestShortener
 * @param {ChunkGraph} contextInfo.chunkGraph chunk graph
 * @param {string | Hash} contextInfo.hashFunction the hash function to use
 * @returns {string} the filename
 */
ModuleFilenameHelpers.createFilename = (
	module = "",
	options,
	{ requestShortener, chunkGraph, hashFunction = "md4" }
) => {
	const opts = {
		namespace: "",
		moduleFilenameTemplate: "",
		...(typeof options === "object"
			? options
			: {
					moduleFilenameTemplate: options
			  })
	};

	let absoluteResourcePath;
	let hash;
	let identifier;
	let moduleId;
	let shortIdentifier;
	if (typeof module === "string") {
		shortIdentifier = memoize(() => requestShortener.shorten(module));
		identifier = shortIdentifier;
		moduleId = () => "";
		absoluteResourcePath = () => module.split("!").pop();
		hash = getHash(identifier, hashFunction);
	} else {
		shortIdentifier = memoize(() =>
			module.readableIdentifier(requestShortener)
		);
		identifier = memoize(() => requestShortener.shorten(module.identifier()));
		moduleId = () => chunkGraph.getModuleId(module);
		absoluteResourcePath = () =>
			module instanceof NormalModule
				? module.resource
				: module.identifier().split("!").pop();
		hash = getHash(identifier, hashFunction);
	}
	const resource = memoize(() => shortIdentifier().split("!").pop());

	const loaders = getBefore(shortIdentifier, "!");
	const allLoaders = getBefore(identifier, "!");
	const query = getAfter(resource, "?");
	const resourcePath = () => {
		const q = query().length;
		return q === 0 ? resource() : resource().slice(0, -q);
	};
	if (typeof opts.moduleFilenameTemplate === "function") {
		return opts.moduleFilenameTemplate(
			lazyObject({
				identifier: identifier,
				shortIdentifier: shortIdentifier,
				resource: resource,
				resourcePath: memoize(resourcePath),
				absoluteResourcePath: memoize(absoluteResourcePath),
				allLoaders: memoize(allLoaders),
				query: memoize(query),
				moduleId: memoize(moduleId),
				hash: memoize(hash),
				namespace: () => opts.namespace
			})
		);
	}

	// TODO webpack 6: consider removing alternatives without dashes
	/** @type {Map<string, function(): string>} */
	const replacements = new Map([
		["identifier", identifier],
		["short-identifier", shortIdentifier],
		["resource", resource],
		["resource-path", resourcePath],
		// cSpell:words resourcepath
		["resourcepath", resourcePath],
		["absolute-resource-path", absoluteResourcePath],
		["abs-resource-path", absoluteResourcePath],
		// cSpell:words absoluteresource
		["absoluteresource-path", absoluteResourcePath],
		// cSpell:words absresource
		["absresource-path", absoluteResourcePath],
		// cSpell:words resourcepath
		["absolute-resourcepath", absoluteResourcePath],
		// cSpell:words resourcepath
		["abs-resourcepath", absoluteResourcePath],
		// cSpell:words absoluteresourcepath
		["absoluteresourcepath", absoluteResourcePath],
		// cSpell:words absresourcepath
		["absresourcepath", absoluteResourcePath],
		["all-loaders", allLoaders],
		// cSpell:words allloaders
		["allloaders", allLoaders],
		["loaders", loaders],
		["query", query],
		["id", moduleId],
		["hash", hash],
		["namespace", () => opts.namespace]
	]);

	// TODO webpack 6: consider removing weird double placeholders
	return opts.moduleFilenameTemplate
		.replace(ModuleFilenameHelpers.REGEXP_ALL_LOADERS_RESOURCE, "[identifier]")
		.replace(
			ModuleFilenameHelpers.REGEXP_LOADERS_RESOURCE,
			"[short-identifier]"
		)
		.replace(REGEXP, (match, content) => {
			if (content.length + 2 === match.length) {
				const replacement = replacements.get(content.toLowerCase());
				if (replacement !== undefined) {
					return replacement();
				}
			} else if (match.startsWith("[\\") && match.endsWith("\\]")) {
				return `[${match.slice(2, -2)}]`;
			}
			return match;
		});
};

ModuleFilenameHelpers.replaceDuplicates = (array, fn, comparator) => {
	const countMap = Object.create(null);
	const posMap = Object.create(null);
	array.forEach((item, idx) => {
		countMap[item] = countMap[item] || [];
		countMap[item].push(idx);
		posMap[item] = 0;
	});
	if (comparator) {
		Object.keys(countMap).forEach(item => {
			countMap[item].sort(comparator);
		});
	}
	return array.map((item, i) => {
		if (countMap[item].length > 1) {
			if (comparator && countMap[item][0] === i) return item;
			return fn(item, i, posMap[item]++);
		} else {
			return item;
		}
	});
};

ModuleFilenameHelpers.matchPart = (str, test) => {
	if (!test) return true;
	test = asRegExp(test);
	if (Array.isArray(test)) {
		return test.map(asRegExp).some(regExp => regExp.test(str));
	} else {
		return test.test(str);
	}
};

ModuleFilenameHelpers.matchObject = (obj, str) => {
	if (obj.test) {
		if (!ModuleFilenameHelpers.matchPart(str, obj.test)) {
			return false;
		}
	}
	if (obj.include) {
		if (!ModuleFilenameHelpers.matchPart(str, obj.include)) {
			return false;
		}
	}
	if (obj.exclude) {
		if (ModuleFilenameHelpers.matchPart(str, obj.exclude)) {
			return false;
		}
	}
	return true;
};
