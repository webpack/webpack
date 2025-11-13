/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const createHash = require("../util/createHash");
const { makePathsRelative } = require("../util/identifier");
const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");
const CssIcssExportDependency = require("./CssIcssExportDependency");

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
/** @typedef {import("../css/CssGenerator")} CssGenerator */
/** @typedef {import("../css/CssParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../util/Hash")} Hash */

const getCssParser = memoize(() => require("../css/CssParser"));

/**
 * @param {string} local css local
 * @param {CssModule} module module
 * @param {ChunkGraph} chunkGraph chunk graph
 * @param {RuntimeTemplate} runtimeTemplate runtime template
 * @returns {string} local ident
 */
const getLocalIdent = (local, module, chunkGraph, runtimeTemplate) => {
	const generator = /** @type {CssGenerator} */ (module.generator);
	const localIdentName =
		/** @type {CssGeneratorLocalIdentName} */
		(generator.localIdentName);
	const relativeResourcePath = makePathsRelative(
		/** @type {string} */
		(module.context),
		/** @type {string} */
		(module.getResource()),
		runtimeTemplate.compilation.compiler.root
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

	const localIdentHash = hash.digest(hashDigest).slice(0, hashDigestLength);

	return runtimeTemplate.compilation
		.getPath(localIdentName, {
			filename: relativeResourcePath,
			hash: localIdentHash,
			contentHash: localIdentHash,
			chunkGraph,
			module
		})
		.replace(/\[local\]/g, local)
		.replace(/\[uniqueName\]/g, /** @type {string} */ (uniqueName))
		.replace(/^((-?[0-9])|--)/, "_$1");
};

class CssIcssLocalIdentifierDependency extends CssIcssExportDependency {
	/**
	 * @param {string} name name
	 * @param {Range} range range
	 * @param {string=} prefix prefix
	 */
	constructor(name, range, prefix = "") {
		super(name);
		this.name = name;
		this.range = range;
		this.prefix = prefix;
	}

	get type() {
		return "css local identifier";
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

CssIcssLocalIdentifierDependency.Template = class CssLocalIdentifierDependencyTemplate extends (
	CssIcssExportDependency.Template
) {
	// TODO refactor me
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {string | undefined} identifier
	 */
	static getIdentifier(dependency, templateContext) {
		const { module: m, moduleGraph, runtime } = templateContext;
		const dep = /** @type {CssIcssLocalIdentifierDependency} */ (dependency);
		const module = /** @type {CssModule} */ (m);
		const generator = /** @type {CssGenerator} */ (module.generator);
		const names = dep.getExportsConventionNames(
			dep.name,
			/** @type {CssGeneratorExportsConvention} */
			(generator.convention)
		);
		const usedNames =
			/** @type {string[]} */
			(
				names
					.map((name) =>
						moduleGraph.getExportInfo(module, name).getUsedName(name, runtime)
					)
					.filter(Boolean)
			);
		const local = usedNames.length === 0 ? names[0] : usedNames[0];
		const prefix = /** @type {CssIcssLocalIdentifierDependency} */ (dependency)
			.prefix;

		return (
			(prefix || "") +
			getCssParser().escapeIdentifier(
				getLocalIdent(
					local,
					/** @type {CssModule} */
					(templateContext.module),
					templateContext.chunkGraph,
					templateContext.runtimeTemplate
				)
			)
		);
	}

	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const { module: m, moduleGraph, runtime, cssData } = templateContext;
		const dep = /** @type {CssIcssLocalIdentifierDependency} */ (dependency);
		const module = /** @type {CssModule} */ (m);
		const generator = /** @type {CssGenerator} */ (module.generator);
		const names = dep.getExportsConventionNames(
			dep.name,
			/** @type {CssGeneratorExportsConvention} */
			(generator.convention)
		);
		const usedNames =
			/** @type {string[]} */
			(
				names
					.map((name) =>
						moduleGraph.getExportInfo(module, name).getUsedName(name, runtime)
					)
					.filter(Boolean)
			);
		const identifier =
			/** @type {string} */
			(
				CssLocalIdentifierDependencyTemplate.getIdentifier(dep, templateContext)
			);

		if (templateContext.type !== "javascript") {
			source.replace(dep.range[0], dep.range[1] - 1, identifier);
		} else {
			for (const used of [...usedNames, ...names]) {
				if (cssData.exports.has(used)) return;
				cssData.exports.set(
					used,
					getCssParser().unescapeIdentifier(identifier)
				);
			}
		}
	}
};

makeSerializable(
	CssIcssLocalIdentifierDependency,
	"webpack/lib/dependencies/CssLocalIdentifierDependency"
);

module.exports = CssIcssLocalIdentifierDependency;
