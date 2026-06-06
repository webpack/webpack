/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const { JAVASCRIPT_TYPE } = require("../ModuleSourceTypeConstants");
const WebpackError = require("../errors/WebpackError");
const { cssExportConvention } = require("../util/conventions");
const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");
const CssIcssExportDependency = require("./CssIcssExportDependency");
const CssIcssImportDependency = require("./CssIcssImportDependency");
const NullDependency = require("./NullDependency");

const getCssTokens = memoize(() => require("../css/walkCssTokens"));

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../../declarations/WebpackOptions").CssGeneratorExportsConvention} CssGeneratorExportsConvention */
/** @typedef {import("../css/CssGenerator")} CssGenerator */
/** @typedef {import("../css/CssModule")} CssModule */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */
/** @typedef {import("../Dependency").ReferencedExports} ReferencedExports */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("../css/CssParser").Range} Range */
/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("./CssIcssExportDependency").ExportMode} ExportMode */
/** @typedef {import("./CssIcssExportDependency").ExportType} ExportType */
/** @typedef {import("./CssIcssExportDependency").Value} Value */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */
/** @typedef {import("../errors/WebpackError")} WebpackErrorType */

const EXPORT_MODE = CssIcssExportDependency.EXPORT_MODE;
const EXPORT_TYPE = CssIcssExportDependency.EXPORT_TYPE;

/**
 * One `:export { name: value }` style entry. Same shape as the legacy
 * per-export `CssIcssExportDependency` fields, but a plain object so a module
 * holds a single `Dependency` plus a flat array instead of thousands of
 * `Dependency` instances. `_conventionNames`/`_valueConventionNames` memoize
 * the convention expansion the way the legacy class did per instance.
 * @typedef {object} CssExportEntry
 * @property {string} name export name
 * @property {Value} value value or [localName, importName, request?]
 * @property {Range=} range source range to replace, when present
 * @property {boolean} interpolate whether the value needs interpolation
 * @property {ExportMode} exportMode export mode
 * @property {ExportType} exportType export type
 * @property {DependencyLocation=} loc per-export source location (for export source maps)
 * @property {string[]=} _conventionNames memoized convention names for `name`
 * @property {string[]=} _valueConventionNames memoized convention names for `value`
 */

/**
 * Memoized `cssExportConvention(entry.name, convention)`.
 * @param {CssExportEntry} entry entry
 * @param {CssGeneratorExportsConvention} convention convention
 * @returns {string[]} convention names
 */
const entryConventionNames = (entry, convention) => {
	if (entry._conventionNames) return entry._conventionNames;
	entry._conventionNames = cssExportConvention(entry.name, convention);
	return entry._conventionNames;
};

/**
 * Memoized `cssExportConvention(entry.value, convention)`. Caller guarantees
 * `typeof entry.value === "string"`.
 * @param {CssExportEntry} entry entry
 * @param {CssGeneratorExportsConvention} convention convention
 * @returns {string[]} convention names
 */
const entryValueConventionNames = (entry, convention) => {
	if (entry._valueConventionNames) return entry._valueConventionNames;
	entry._valueConventionNames = cssExportConvention(
		/** @type {string} */ (entry.value),
		convention
	);
	return entry._valueConventionNames;
};

class CssExportsDependency extends NullDependency {
	/**
	 * One consolidated `:export` dependency for a whole CSS module.
	 * @param {CssExportEntry[]} entries export entries in source order
	 */
	constructor(entries) {
		super();
		/** @type {CssExportEntry[]} */
		this.entries = entries;
		/** @type {undefined | string} */
		this._hashUpdate = undefined;
	}

	get type() {
		return "css :export";
	}

	/**
	 * Returns the exported names
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {ExportsSpec | undefined} export names
	 */
	getExports(moduleGraph) {
		const module = /** @type {CssModule} */ (moduleGraph.getParentModule(this));
		const generator = /** @type {CssGenerator} */ (module.generator);
		const convention =
			/** @type {CssGeneratorExportsConvention} */
			(generator.options.exportsConvention);

		/** @type {{ name: string, canMangle: boolean }[]} */
		const exports = [];
		for (const entry of this.entries) {
			if (
				entry.exportMode === EXPORT_MODE.NONE ||
				entry.exportMode === EXPORT_MODE.SELF_REFERENCE
			) {
				continue;
			}
			for (const name of entryConventionNames(entry, convention)) {
				exports.push({ name, canMangle: true });
			}
		}

		if (exports.length === 0) return undefined;
		return { exports, dependencies: undefined };
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {ReferencedExports} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		// `composes: foo;` (SELF_REFERENCE) references the composed class
		// (`entry.value`), not the composing class. Every other entry mode
		// keeps the whole exports object referenced (legacy behaviour), so the
		// presence of any such entry subsumes the self-reference names.
		let hasNonSelfReference = false;
		/** @type {ReferencedExports} */
		const referenced = [];
		let generator;
		for (const entry of this.entries) {
			if (
				entry.exportMode === EXPORT_MODE.SELF_REFERENCE &&
				typeof entry.value === "string"
			) {
				const module =
					/** @type {CssModule} */
					(moduleGraph.getParentModule(this));
				generator = generator || /** @type {CssGenerator} */ (module.generator);
				const names = entryValueConventionNames(
					entry,
					/** @type {CssGeneratorExportsConvention} */
					(generator.options.exportsConvention)
				);
				for (const name of names) {
					referenced.push({ name: [name], canMangle: true });
				}
			} else {
				hasNonSelfReference = true;
			}
		}

		if (hasNonSelfReference) {
			return super.getReferencedExports(moduleGraph, runtime);
		}
		if (referenced.length === 0) {
			return super.getReferencedExports(moduleGraph, runtime);
		}
		return referenced;
	}

	/**
	 * Returns warnings.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {WebpackError[] | null | undefined} warnings
	 */
	getWarnings(moduleGraph) {
		/** @type {WebpackErrorType[] | null} */
		let warnings = null;
		let module;
		let exportsInfo;
		let convention;
		for (const entry of this.entries) {
			if (
				entry.exportMode !== EXPORT_MODE.SELF_REFERENCE ||
				typeof entry.value !== "string"
			) {
				continue;
			}
			if (module === undefined) {
				module =
					/** @type {CssModule | undefined} */
					(moduleGraph.getParentModule(this));
				if (!module) return warnings;
				const generator = /** @type {CssGenerator} */ (module.generator);
				convention =
					/** @type {CssGeneratorExportsConvention} */
					(generator.options.exportsConvention);
				exportsInfo = moduleGraph.getExportsInfo(module);
			}
			const names = entryValueConventionNames(
				entry,
				/** @type {CssGeneratorExportsConvention} */ (convention)
			);
			const ei = /** @type {NonNullable<typeof exportsInfo>} */ (exportsInfo);
			const isProvided = names.some((name) => ei.isExportProvided(name));
			if (!isProvided) {
				const error = new WebpackError(
					`Self-referencing name "${entry.value}" not found`
				);
				error.module = module;
				// Per-entry loc so Compilation attributes the warning precisely
				// (it can't use the consolidated dependency's single loc).
				if (entry.loc) error.loc = entry.loc;
				if (warnings === null) warnings = [];
				warnings.push(error);
			}
		}
		return warnings;
	}

	/**
	 * Updates the hash with the data contributed by this instance.
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
			const convention =
				/** @type {CssGeneratorExportsConvention} */
				(generator.options.exportsConvention);
			const localIdentName = JSON.stringify(generator.options.localIdentName);
			// Concatenate each entry's contribution with no separator so the byte
			// stream matches the legacy per-export `updateHash` sequence exactly
			// (keeps module hashes stable for import-free modules).
			let update = "";
			for (const entry of this.entries) {
				const names = entryConventionNames(entry, convention);
				update += `exportsConvention|${JSON.stringify(names)}|localIdentName|${localIdentName}|value|${JSON.stringify(entry.value)}|range|${JSON.stringify(entry.range)}|interpolate|${entry.interpolate}|exportMode|${entry.exportMode}|exportType|${entry.exportType}`;
			}
			this._hashUpdate = update;
		}
		hash.update(this._hashUpdate);
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.entries.length);
		for (const entry of this.entries) {
			write(entry.name);
			write(entry.value);
			write(entry.range);
			write(entry.interpolate);
			write(entry.exportMode);
			write(entry.exportType);
			write(entry.loc);
		}
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		const length = /** @type {number} */ (read());
		/** @type {CssExportEntry[]} */
		const entries = [];
		for (let i = 0; i < length; i++) {
			entries.push({
				name: /** @type {string} */ (read()),
				value: /** @type {Value} */ (read()),
				range: /** @type {Range=} */ (read()),
				interpolate: /** @type {boolean} */ (read()),
				exportMode: /** @type {ExportMode} */ (read()),
				exportType: /** @type {ExportType} */ (read()),
				loc: /** @type {DependencyLocation=} */ (read())
			});
		}
		this.entries = entries;
		this._hashUpdate = undefined;
		super.deserialize(context);
	}
}

/**
 * Finds the export entry with `name` in `module`'s consolidated dependency.
 * @param {CssModule} module module to search
 * @param {string} name export name
 * @returns {CssExportEntry | undefined} matching entry, if any
 */
const findExportEntry = (module, name) => {
	for (const dep of module.dependencies) {
		if (dep instanceof CssExportsDependency) {
			for (const entry of dep.entries) {
				if (entry.name === name) return entry;
			}
		}
	}
	return undefined;
};

/**
 * Finds the active `CssIcssImportDependency` for a given local name. See the
 * legacy `CssIcssExportDependency.Template.findImportDep` for the `request`
 * disambiguation rules.
 * @param {Iterable<Dependency>} dependencies module dependencies to search
 * @param {string} localName local name
 * @param {string=} request user request of the `@value` import to match
 * @returns {CssIcssImportDependency | undefined} matching import dep, if any
 */
const findImportDep = (dependencies, localName, request) => {
	/** @type {CssIcssImportDependency | undefined} */
	let firstMatch;
	for (const d of dependencies) {
		if (d instanceof CssIcssImportDependency && d.localName === localName) {
			if (request === undefined) return d;
			if (d.request === request) return d;
			if (firstMatch === undefined) firstMatch = d;
		}
	}
	return firstMatch;
};

CssExportsDependency.Template = class CssExportsDependencyTemplate extends (
	NullDependency.Template
) {
	/**
	 * Resolves a `[localName, importName, request]` reference to its final
	 * value by following `@value` imports into other modules' consolidated
	 * export dependencies.
	 * @param {string} localName local name
	 * @param {string} importName import name
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @param {string | undefined} request user request of the `@value` import
	 * @param {Set<CssExportEntry>=} seen cycle guard
	 * @returns {string | undefined} found reference
	 */
	static resolve(
		localName,
		importName,
		templateContext,
		request,
		seen = new Set()
	) {
		const { moduleGraph } = templateContext;
		const importDep = findImportDep(
			templateContext.module.dependencies,
			localName,
			request
		);
		if (!importDep) return undefined;

		const module = /** @type {CssModule} */ (moduleGraph.getModule(importDep));
		if (!module) return undefined;

		const exportEntry = findExportEntry(module, importName);
		if (!exportEntry) return undefined;
		if (seen.has(exportEntry)) return undefined;
		seen.add(exportEntry);

		const { value, interpolate } = exportEntry;

		if (Array.isArray(value)) {
			return CssExportsDependencyTemplate.resolve(
				value[0],
				value[1],
				{ ...templateContext, module },
				value[2],
				seen
			);
		}

		if (interpolate) {
			return CssExportsDependencyTemplate.getIdentifier(value, exportEntry, {
				...templateContext,
				module
			});
		}

		return value;
	}

	/**
	 * Resolves all references of a `composes` entry, deduplicated.
	 * @param {CssExportEntry} entry composes entry
	 * @param {DependencyTemplateContext} templateContext template context
	 * @param {Set<CssExportEntry>} seen cycle guard
	 * @returns {string[]} final names
	 */
	static resolveReferences(entry, templateContext, seen) {
		/** @type {string[]} */
		const references = [];

		if (seen.has(entry)) return references;
		seen.add(entry);

		if (Array.isArray(entry.value)) {
			const importDep = findImportDep(
				templateContext.module.dependencies,
				entry.value[0],
				entry.value[2]
			);
			if (!importDep) return references;

			const module =
				/** @type {CssModule} */
				(templateContext.moduleGraph.getModule(importDep));
			if (!module) return references;

			for (const dep of module.dependencies) {
				if (!(dep instanceof CssExportsDependency)) continue;
				for (const d of dep.entries) {
					if (d.name !== /** @type {string[]} */ (entry.value)[1]) continue;
					if (Array.isArray(d.value)) {
						references.push(
							...CssExportsDependencyTemplate.resolveReferences(
								d,
								{ ...templateContext, module },
								seen
							)
						);
					} else {
						references.push(
							CssExportsDependencyTemplate.getIdentifier(d.value, d, {
								...templateContext,
								module
							})
						);
					}
				}
			}
		} else {
			references.push(
				CssExportsDependencyTemplate.getIdentifier(
					/** @type {string} */ (entry.value),
					entry,
					templateContext
				)
			);

			for (const dep of templateContext.module.dependencies) {
				if (!(dep instanceof CssExportsDependency)) continue;
				for (const d of dep.entries) {
					if (d.exportType === EXPORT_TYPE.COMPOSES && d.name === entry.value) {
						if (Array.isArray(d.value)) {
							references.push(
								...CssExportsDependencyTemplate.resolveReferences(
									d,
									templateContext,
									seen
								)
							);
						} else {
							references.push(
								CssExportsDependencyTemplate.getIdentifier(
									d.value,
									d,
									templateContext
								)
							);
						}
					}
				}
			}
		}

		return [...new Set(references)];
	}

	/**
	 * Returns the interpolated identifier for an entry value.
	 * @param {string} value value to identifier
	 * @param {CssExportEntry} entry the entry
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {string} identifier
	 */
	static getIdentifier(value, entry, templateContext) {
		if (!entry.interpolate) return value;
		const { moduleGraph, module, chunkGraph, runtimeTemplate } =
			templateContext;
		return moduleGraph.cached(
			CssIcssExportDependency.computeInterpolatedIdentifier,
			/** @type {CssModule} */ (module),
			value,
			entry.exportType,
			chunkGraph,
			runtimeTemplate
		);
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const dep = /** @type {CssExportsDependency} */ (dependency);
		const { module: m, moduleGraph, runtime, cssData } = templateContext;
		const module = /** @type {CssModule} */ (m);
		const generator = /** @type {CssGenerator} */ (module.generator);
		const isJs = templateContext.type === JAVASCRIPT_TYPE;

		for (const entry of dep.entries) {
			if (!entry.range && !isJs) continue;
			const isReference = Array.isArray(entry.value);

			/** @type {string} */
			let value;
			if (entry.exportType === EXPORT_TYPE.COMPOSES && isJs) {
				value = CssExportsDependencyTemplate.resolveReferences(
					entry,
					templateContext,
					new Set()
				).join(" ");
			} else if (isReference) {
				const resolved = CssExportsDependencyTemplate.resolve(
					/** @type {string[]} */ (entry.value)[0],
					/** @type {string[]} */ (entry.value)[1],
					templateContext,
					/** @type {string[]} */ (entry.value)[2],
					new Set()
				);
				value = resolved || /** @type {string[]} */ (entry.value)[0];
			} else {
				value = CssExportsDependencyTemplate.getIdentifier(
					/** @type {string} */ (entry.value),
					entry,
					templateContext
				);
			}

			if (entry.exportType === EXPORT_TYPE.GRID_CUSTOM_IDENTIFIER) {
				value += `-${entry.name}`;
			}

			if (isJs && entry.exportMode !== EXPORT_MODE.NONE) {
				const names = entryConventionNames(
					entry,
					/** @type {CssGeneratorExportsConvention} */
					(generator.options.exportsConvention)
				);
				/** @type {Set<string>} */
				const allNames = new Set();
				for (const name of names) {
					const usedName = moduleGraph
						.getExportInfo(module, name)
						.getUsedName(name, runtime);
					if (usedName) allNames.add(/** @type {string} */ (usedName));
				}
				for (const name of names) allNames.add(name);
				const unescaped = getCssTokens().unescapeIdentifier(
					value,
					templateContext.runtimeTemplate.compilation.compiler.root
				);

				const depLocStart =
					entry.loc &&
					/** @type {{ start?: { line: number, column: number } }} */ (
						entry.loc
					).start;
				for (const used of allNames) {
					if (entry.exportMode === EXPORT_MODE.ONCE) {
						if (cssData.exports.has(used)) continue;
						cssData.exports.set(used, unescaped);
						if (
							depLocStart &&
							cssData.exportLocs &&
							!cssData.exportLocs.has(used)
						) {
							cssData.exportLocs.set(used, {
								line: depLocStart.line,
								column: depLocStart.column
							});
						}
					} else {
						const originalValue =
							entry.exportMode === EXPORT_MODE.REPLACE
								? undefined
								: cssData.exports.get(used);
						cssData.exports.set(
							used,
							`${originalValue ? `${originalValue}${unescaped ? " " : ""}` : ""}${unescaped}`
						);
						if (
							depLocStart &&
							cssData.exportLocs &&
							!cssData.exportLocs.has(used)
						) {
							cssData.exportLocs.set(used, {
								line: depLocStart.line,
								column: depLocStart.column
							});
						}
					}
				}
			} else if (
				entry.range &&
				templateContext.type !== JAVASCRIPT_TYPE &&
				entry.exportMode !== EXPORT_MODE.APPEND &&
				entry.exportMode !== EXPORT_MODE.SELF_REFERENCE
			) {
				source.replace(entry.range[0], entry.range[1] - 1, value);
			}
		}
	}
};

makeSerializable(
	CssExportsDependency,
	"webpack/lib/dependencies/CssExportsDependency"
);

module.exports = CssExportsDependency;
