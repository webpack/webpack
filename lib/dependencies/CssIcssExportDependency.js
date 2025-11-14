/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const { cssExportConvention } = require("../util/conventions");
const createHash = require("../util/createHash");
const { makePathsRelative } = require("../util/identifier");
const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");
const CssIcssImportDependency = require("./CssIcssImportDependency");
const NullDependency = require("./NullDependency");

const getCssParser = memoize(() => require("../css/CssParser"));

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../../declarations/WebpackOptions").CssGeneratorExportsConvention} CssGeneratorExportsConvention */
/** @typedef {import("../../declarations/WebpackOptions").CssGeneratorLocalIdentName} CssGeneratorLocalIdentName */
/** @typedef {import("../CssModule")} CssModule */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../css/CssGenerator")} CssGenerator */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */

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

class CssIcssExportDependency extends NullDependency {
	/**
	 * Example of dependency:
	 *
	 * :export { LOCAL_NAME: EXPORT_NAME }
	 * @param {string} name export name
	 * @param {string | true} value export value or true when we need interpolate name as a value
	 * @param {string=} reexport reexport name
	 * @param {boolean=} once true when exports should be modified once, otherwise false
	 */
	constructor(name, value, reexport, once = true) {
		super();
		this.name = name;
		this.value = value;
		this.reexport = reexport;
		this.once = once;
		this._hashUpdate = undefined;
	}

	get type() {
		return "css :export";
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
		this._conventionNames = cssExportConvention(name, convention);
		return this._conventionNames;
	}

	/**
	 * Returns the exported names
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {ExportsSpec | undefined} export names
	 */
	getExports(moduleGraph) {
		const module = /** @type {CssModule} */ (moduleGraph.getParentModule(this));
		const generator = /** @type {CssGenerator} */ (module.generator);
		const names = this.getExportsConventionNames(
			this.name,
			/** @type {CssGeneratorExportsConvention} */
			(generator.convention)
		);
		return {
			exports: names.map((name) => ({
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
		if (this._hashUpdate === undefined) {
			const module =
				/** @type {CssModule} */
				(chunkGraph.moduleGraph.getParentModule(this));
			const generator = /** @type {CssGenerator} */ (module.generator);
			const names = this.getExportsConventionNames(
				this.name,
				/** @type {CssGeneratorExportsConvention} */
				(generator.convention)
			);
			this._hashUpdate = `exportsConvention|${JSON.stringify(names)}|localIdentName|${JSON.stringify(generator.localIdentName)}`;
		}
		hash.update(this._hashUpdate);
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.name);
		write(this.value);
		write(this.reexport);
		write(this.once);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.name = read();
		this.value = read();
		this.reexport = read();
		this.once = read();
		super.deserialize(context);
	}
}

CssIcssExportDependency.Template = class CssIcssExportDependencyTemplate extends (
	NullDependency.Template
) {
	// TODO looking how to cache
	/**
	 * @param {string} symbol the name of symbol
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {string | undefined} found reference
	 */
	static findReference(symbol, templateContext) {
		for (const item of templateContext.module.dependencies) {
			if (item instanceof CssIcssImportDependency) {
				// Looking for the referring module
				const module = templateContext.moduleGraph.getModule(item);

				if (!module) {
					return undefined;
				}

				for (let i = module.dependencies.length - 1; i >= 0; i--) {
					const nestedDep = module.dependencies[i];
					if (
						nestedDep instanceof CssIcssExportDependency &&
						symbol === nestedDep.name
					) {
						if (nestedDep.reexport) {
							return this.findReference(nestedDep.reexport, {
								...templateContext,
								module
							});
						}

						return CssIcssExportDependency.Template.getIdentifier(nestedDep, {
							...templateContext,
							module
						});
					}
				}
			}
		}
	}

	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {Set<string>} names
	 */
	static getNames(dependency, templateContext) {
		const { module: m, moduleGraph, runtime } = templateContext;
		const dep = /** @type {CssIcssExportDependency} */ (dependency);
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

		return new Set([...usedNames, ...names]);
	}

	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {string} identifier
	 */
	static getIdentifier(dependency, templateContext) {
		const dep = /** @type {CssIcssExportDependency} */ (dependency);
		const value = dep.value;

		if (value === true) {
			const { module: m, moduleGraph, runtime } = templateContext;
			const dep = /** @type {CssIcssExportDependency} */ (dependency);
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
			const prefix =
				/** @type {CssIcssExportDependency & { prefix: string }} */
				(dependency).prefix;

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

		return /** @type {string} */ (dep.value);
	}

	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		if (templateContext.type !== "javascript") return;
		const { cssData } = templateContext;
		const dep = /** @type {CssIcssExportDependency} */ (dependency);
		const names = CssIcssExportDependencyTemplate.getNames(
			dependency,
			templateContext
		);

		const value =
			dep.reexport && typeof dep.value === "string"
				? CssIcssExportDependencyTemplate.findReference(
						dep.value,
						templateContext
					) || dep.value
				: dep.value;

		for (const used of names) {
			const originalValue = dep.once ? undefined : cssData.exports.get(used);

			cssData.exports.set(
				used,
				`${originalValue ? `${originalValue} ` : ""}${value}`
			);
		}
	}
};

makeSerializable(
	CssIcssExportDependency,
	"webpack/lib/dependencies/CssIcssExportDependency"
);

module.exports = CssIcssExportDependency;
