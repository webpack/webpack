/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const { cssExportConvention } = require("../util/conventions");
const createHash = require("../util/createHash");
const { makePathsRelative } = require("../util/identifier");
const makeSerializable = require("../util/makeSerializable");
const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../../declarations/WebpackOptions").CssGeneratorExportsConvention} CssGeneratorExportsConvention */
/** @typedef {import("../../declarations/WebpackOptions").CssGeneratorLocalIdentName} CssGeneratorLocalIdentName */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../CssModule")} CssModule */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("../css/CssExportsGenerator")} CssExportsGenerator */
/** @typedef {import("../css/CssGenerator")} CssGenerator */
/** @typedef {import("../css/CssParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../util/Hash")} Hash */

/**
 * @param {string} local css local
 * @param {CssModule} module module
 * @param {ChunkGraph} chunkGraph chunk graph
 * @param {RuntimeTemplate} runtimeTemplate runtime template
 * @returns {string} local ident
 */
const getLocalIdent = (local, module, chunkGraph, runtimeTemplate) => {
	const localIdentName =
		/** @type {CssGenerator | CssExportsGenerator} */
		(module.generator).localIdentName;
	const relativeResourcePath = makePathsRelative(
		/** @type {string} */ (module.context),
		module.resourceResolveData.path
	);
	const { hashFunction, hashDigest, hashDigestLength, hashSalt, uniqueName } =
		runtimeTemplate.outputOptions;
	const hash = createHash(hashFunction);
	if (hashSalt) {
		hash.update(hashSalt);
	}
	hash.update(relativeResourcePath);
	if (!/\[local\]/.test(localIdentName)) {
		hash.update(local);
	}
	const localIdentHash = /** @type {string} */ (hash.digest(hashDigest))
		// Remove all leading digits
		.replace(/^\d+/, "")
		// Replace all slashes with underscores (same as in base64url)
		.replace(/\//g, "_")
		// Remove everything that is not an alphanumeric or underscore
		.replace(/[^A-Za-z0-9_]+/g, "_")
		.slice(0, hashDigestLength);
	return runtimeTemplate.compilation
		.getPath(localIdentName, {
			filename: relativeResourcePath,
			hash: localIdentHash,
			contentHash: localIdentHash,
			chunkGraph,
			module
		})
		.replace(/\[local\]/g, local)
		.replace(/\[uniqueName\]/g, uniqueName);
};

class CssLocalIdentifierDependency extends NullDependency {
	/**
	 * @param {string} name name
	 * @param {Range} range range
	 * @param {string=} prefix prefix
	 */
	constructor(name, range, prefix = "") {
		super();
		this.name = name;
		this.range = range;
		this.prefix = prefix;
	}

	get type() {
		return "css local identifier";
	}

	/**
	 * @param {string} name export name
	 * @param {CssGeneratorExportsConvention} convention convention of the export name
	 * @returns {string[]} convention results
	 */
	getExportsConventionNames(name, convention) {
		if (this._conventionNames) {
			return this._conventionNames;
		}
		this._conventionNames = cssExportConvention(this.name, convention);
		return this._conventionNames;
	}

	/**
	 * Returns the exported names
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {ExportsSpec | undefined} export names
	 */
	getExports(moduleGraph) {
		const module = /** @type {CssModule} */ (moduleGraph.getParentModule(this));
		const convention = /** @type {CssGenerator | CssExportsGenerator} */ (
			module.generator
		).convention;
		const names = this.getExportsConventionNames(this.name, convention);
		return {
			exports: names.map(name => ({
				name,
				canMangle: true
			})),
			dependencies: undefined
		};
	}

	/**
	 * Update the hash
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, { chunkGraph }) {
		const module = /** @type {CssModule} */ (
			chunkGraph.moduleGraph.getParentModule(this)
		);
		const generator = /** @type {CssGenerator | CssExportsGenerator} */ (
			module.generator
		);
		const names = this.getExportsConventionNames(
			this.name,
			generator.convention
		);
		hash.update(`exportsConvention`);
		hash.update(JSON.stringify(names));
		hash.update(`localIdentName`);
		hash.update(generator.localIdentName);
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.name);
		write(this.range);
		write(this.prefix);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.name = read();
		this.range = read();
		this.prefix = read();
		super.deserialize(context);
	}
}

/**
 * @param {string} str string
 * @param {string | boolean} omitUnderscore true if you need to omit underscore
 * @returns {string} escaped css identifier
 */
const escapeCssIdentifier = (str, omitUnderscore) => {
	const escaped = `${str}`.replace(
		// cspell:word uffff
		/[^a-zA-Z0-9_\u0081-\uffff-]/g,
		s => `\\${s}`
	);
	return !omitUnderscore && /^(?!--)[0-9-]/.test(escaped)
		? `_${escaped}`
		: escaped;
};

CssLocalIdentifierDependency.Template = class CssLocalIdentifierDependencyTemplate extends (
	NullDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(
		dependency,
		source,
		{
			module: m,
			moduleGraph,
			chunkGraph,
			runtime,
			runtimeTemplate,
			cssExportsData
		}
	) {
		const dep = /** @type {CssLocalIdentifierDependency} */ (dependency);
		const module = /** @type {CssModule} */ (m);
		const convention = /** @type {CssGenerator | CssExportsGenerator} */ (
			module.generator
		).convention;
		const names = dep.getExportsConventionNames(dep.name, convention);
		const usedNames = /** @type {string[]} */ (
			names
				.map(name =>
					moduleGraph.getExportInfo(module, name).getUsedName(name, runtime)
				)
				.filter(Boolean)
		);
		if (usedNames.length === 0) return;

		// use the first usedName to generate localIdent, it's shorter when mangle exports enabled
		const localIdent =
			dep.prefix +
			getLocalIdent(usedNames[0], module, chunkGraph, runtimeTemplate);
		source.replace(
			dep.range[0],
			dep.range[1] - 1,
			escapeCssIdentifier(localIdent, dep.prefix)
		);
		for (const used of usedNames) {
			cssExportsData.exports.set(used, localIdent);
		}
	}
};

makeSerializable(
	CssLocalIdentifierDependency,
	"webpack/lib/dependencies/CssLocalIdentifierDependency"
);

module.exports = CssLocalIdentifierDependency;
