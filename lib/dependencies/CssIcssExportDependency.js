/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const { CSS_TYPE, JAVASCRIPT_TYPE } = require("../ModuleSourceTypeConstants");
const WebpackError = require("../WebpackError");
const { cssExportConvention } = require("../util/conventions");
const createHash = require("../util/createHash");
const { makePathsRelative } = require("../util/identifier");
const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");
const nonNumericOnlyHash = require("../util/nonNumericOnlyHash");
const CssIcssImportDependency = require("./CssIcssImportDependency");
const NullDependency = require("./NullDependency");

const getCssParser = memoize(() => require("../css/CssParser"));

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../../declarations/WebpackOptions").CssGeneratorExportsConvention} CssGeneratorExportsConvention */
/** @typedef {import("../../declarations/WebpackOptions").CssGeneratorLocalIdentName} CssGeneratorLocalIdentName */
/** @typedef {import("../CssModule")} CssModule */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").ReferencedExports} ReferencedExports */
/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../css/CssGenerator")} CssGenerator */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("../css/CssParser").Range} Range */

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
		(generator.options.localIdentName);
	const relativeResourcePath = makePathsRelative(
		/** @type {string} */
		(module.context),
		/** @type {string} */
		(module.getResource()),
		runtimeTemplate.compilation.compiler.root
	);
	const { uniqueName } = runtimeTemplate.outputOptions;

	let localIdentHash = "";

	if (/\[(fullhash|hash)\]/.test(localIdentName)) {
		const hashSalt = generator.options.localIdentHashSalt;
		const hashDigest =
			/** @type {string} */
			(generator.options.localIdentHashDigest);
		const hashDigestLength = generator.options.localIdentHashDigestLength;
		const { hashFunction } = runtimeTemplate.outputOptions;

		const hash = createHash(hashFunction);

		if (hashSalt) {
			hash.update(hashSalt);
		}

		if (uniqueName) {
			hash.update(uniqueName);
		}

		hash.update(relativeResourcePath);
		hash.update(local);

		localIdentHash = hash.digest(hashDigest).slice(0, hashDigestLength);
	}

	let contentHash = "";

	if (/\[contenthash\]/.test(localIdentName)) {
		const hash = createHash(runtimeTemplate.outputOptions.hashFunction);
		const source = module.originalSource();

		if (source) {
			hash.update(source.buffer());
		}

		if (module.error) {
			hash.update(module.error.toString());
		}

		const fullContentHash = hash.digest(
			runtimeTemplate.outputOptions.hashDigest
		);

		contentHash = nonNumericOnlyHash(
			fullContentHash,
			runtimeTemplate.outputOptions.hashDigestLength
		);
	}

	let localIdent = runtimeTemplate.compilation.getPath(localIdentName, {
		prepareId: (id) => {
			if (typeof id !== "string") return id;

			return id
				.replace(/^([.-]|[^a-zA-Z0-9_-])+/, "")
				.replace(/[^a-zA-Z0-9_-]+/g, "_");
		},
		filename: relativeResourcePath,
		hash: localIdentHash,
		contentHash,
		chunkGraph,
		module
	});

	if (/\[local\]/.test(localIdentName)) {
		localIdent = localIdent.replace(/\[local\]/g, local);
	}

	if (/\[uniqueName\]/.test(localIdentName)) {
		localIdent = localIdent.replace(
			/\[uniqueName\]/g,
			/** @type {string} */ (uniqueName)
		);
	}

	// Protect the first character from unsupported values
	return localIdent.replace(/^((-?[0-9])|--)/, "_$1");
};

// 0 - replace, 1 - append, 2 - once
/** @typedef {0 | 1 | 2 | 3} ExportMode */
// 0 - none, 1 - name, 1 - value
/** @typedef {0 | 1 | 2} InterpolationMode */
// 0 - normal, 1 - custom css variable, 2 - self-reference
/** @typedef {0 | 1 | 2} ExportType */

class CssIcssExportDependency extends NullDependency {
	/**
	 * Example of dependency:
	 *
	 * :export { LOCAL_NAME: EXPORT_NAME }
	 * @param {string} name export name
	 * @param {string} value export value or true when we need interpolate name as a value
	 * @param {string=} reexport reexport name
	 * @param {Range=} range range
	 * @param {ExportMode=} exportMode export mode
	 * @param {InterpolationMode=} interpolationMode interpolation mode
	 * @param {ExportType=} exportType export type
	 */
	constructor(
		name,
		value,
		reexport,
		range,
		exportMode = CssIcssExportDependency.EXPORT_MODE.REPLACE,
		interpolationMode = CssIcssExportDependency.INTERPOLATION_MODE.NONE,
		exportType = CssIcssExportDependency.EXPORT_TYPE.NORMAL
	) {
		super();
		this.name = name;
		this.value = value;
		this.reexport = reexport;
		this.range = range;
		this.exportMode = exportMode;
		this.interpolationMode = interpolationMode;
		this.exportType = exportType;
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
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {ReferencedExports} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		if (
			this.exportType === CssIcssExportDependency.EXPORT_TYPE.SELF_REFERENCE
		) {
			return [
				{
					name: [this.name],
					canMangle: true
				}
			];
		}

		return super.getReferencedExports(moduleGraph, runtime);
	}

	/**
	 * Returns the exported names
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {ExportsSpec | undefined} export names
	 */
	getExports(moduleGraph) {
		if (
			this.exportType === CssIcssExportDependency.EXPORT_TYPE.SELF_REFERENCE ||
			this.exportMode === CssIcssExportDependency.EXPORT_MODE.NONE
		) {
			return;
		}

		const module = /** @type {CssModule} */ (moduleGraph.getParentModule(this));
		const generator = /** @type {CssGenerator} */ (module.generator);
		const names = this.getExportsConventionNames(
			this.name,
			/** @type {CssGeneratorExportsConvention} */
			(generator.options.exportsConvention)
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
	 * Returns warnings
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {WebpackError[] | null | undefined} warnings
	 */
	getWarnings(moduleGraph) {
		if (
			this.exportType === CssIcssExportDependency.EXPORT_TYPE.SELF_REFERENCE &&
			!this.reexport
		) {
			const module = moduleGraph.getParentModule(this);

			if (
				module &&
				!moduleGraph.getExportsInfo(module).isExportProvided(this.value)
			) {
				const error = new WebpackError(
					`Self-referencing name "${this.value}" not found`
				);
				error.module = module;

				return [error];
			}
		}

		return null;
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
				(generator.options.exportsConvention)
			);
			this._hashUpdate = `exportsConvention|${JSON.stringify(names)}|localIdentName|${JSON.stringify(generator.options.localIdentName)}`;
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
		write(this.range);
		write(this.exportMode);
		write(this.interpolationMode);
		write(this.exportType);
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
		this.range = read();
		this.exportMode = read();
		this.interpolationMode = read();
		this.exportType = read();
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
	 * @returns {string} identifier
	 */
	static getIdentifier(dependency, templateContext) {
		const dep = /** @type {CssIcssExportDependency} */ (dependency);

		if (
			dep.interpolationMode === CssIcssExportDependency.INTERPOLATION_MODE.VALUE
		) {
			const { module: m } = templateContext;
			const module = /** @type {CssModule} */ (m);
			const generator = /** @type {CssGenerator} */ (module.generator);
			const local = cssExportConvention(
				dep.value,
				/** @type {CssGeneratorExportsConvention} */
				(generator.options.exportsConvention)
			)[0];
			const prefix =
				dep.exportType === CssIcssExportDependency.EXPORT_TYPE.CUSTOM_VARIABLE
					? "--"
					: "";

			return (
				prefix +
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
		const dep = /** @type {CssIcssExportDependency} */ (dependency);
		if (!dep.range && templateContext.type !== JAVASCRIPT_TYPE) return;
		const { cssData } = templateContext;
		const { module: m, moduleGraph, runtime } = templateContext;
		const module = /** @type {CssModule} */ (m);
		const generator = /** @type {CssGenerator} */ (module.generator);
		const names = dep.getExportsConventionNames(
			dep.name,
			/** @type {CssGeneratorExportsConvention} */
			(generator.options.exportsConvention)
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

		const allNames = new Set([...usedNames, ...names]);

		/** @type {string} */
		let value = dep.value;

		if (dep.reexport) {
			const resolved = CssIcssExportDependencyTemplate.findReference(
				dep.reexport,
				templateContext
			);

			if (resolved) {
				value = resolved;
			}
		}

		if (
			dep.interpolationMode !== CssIcssExportDependency.INTERPOLATION_MODE.NONE
		) {
			value = CssIcssExportDependencyTemplate.getIdentifier(
				dep,
				templateContext
			);
		}

		if (
			templateContext.type === JAVASCRIPT_TYPE &&
			dep.exportMode !== CssIcssExportDependency.EXPORT_MODE.NONE
		) {
			for (const used of allNames) {
				if (dep.exportMode === CssIcssExportDependency.EXPORT_MODE.ONCE) {
					if (cssData.exports.has(used)) return;
					cssData.exports.set(
						used,
						`${getCssParser().unescapeIdentifier(value)}`
					);
				} else {
					const originalValue =
						dep.exportMode === CssIcssExportDependency.EXPORT_MODE.REPLACE
							? undefined
							: cssData.exports.get(used);

					const newValue =
						dep.exportType ===
						CssIcssExportDependency.EXPORT_TYPE.SELF_REFERENCE
							? cssData.exports.get(dep.value) || value
							: getCssParser().unescapeIdentifier(value);

					cssData.exports.set(
						used,
						`${originalValue ? `${originalValue}${newValue ? " " : ""}` : ""}${newValue}`
					);
				}
			}
		} else if (
			dep.range &&
			templateContext.type === CSS_TYPE &&
			dep.exportMode !== CssIcssExportDependency.EXPORT_MODE.APPEND
		) {
			source.replace(dep.range[0], dep.range[1] - 1, value);
		}
	}
};

/** @type {Record<"NONE" | "REPLACE" | "APPEND" | "ONCE", ExportMode>} */
CssIcssExportDependency.EXPORT_MODE = {
	// TODO do we need to move this logic into ICSSSymbol?
	NONE: 0,
	REPLACE: 1,
	APPEND: 2,
	ONCE: 3
};

/** @type {Record<"NONE" | "NAME" | "VALUE", InterpolationMode>} */
CssIcssExportDependency.INTERPOLATION_MODE = {
	// TODO do we really need name?
	NONE: 0,
	NAME: 1,
	VALUE: 2
};

// TODO merge with export mode?
/** @type {Record<"NORMAL" | "CUSTOM_VARIABLE" | "SELF_REFERENCE", ExportType>} */
CssIcssExportDependency.EXPORT_TYPE = {
	NORMAL: 0,
	CUSTOM_VARIABLE: 1,
	SELF_REFERENCE: 2
};

makeSerializable(
	CssIcssExportDependency,
	"webpack/lib/dependencies/CssIcssExportDependency"
);

module.exports = CssIcssExportDependency;
