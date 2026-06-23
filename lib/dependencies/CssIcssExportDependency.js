/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const { JAVASCRIPT_TYPE } = require("../ModuleSourceTypeConstants");
const { interpolate } = require("../TemplatedPathPlugin");
const WebpackError = require("../errors/WebpackError");
const { cssExportConvention } = require("../util/conventions");
const createHash = require("../util/createHash");
const { makePathsRelative } = require("../util/identifier");
const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");
const { digestNonNumericOnly } = require("../util/nonNumericOnlyHash");
const { updateHashFromSource } = require("../util/source");
const CssIcssImportDependency = require("./CssIcssImportDependency");
const NullDependency = require("./NullDependency");

const getCssTokens = memoize(() => require("../css/syntax"));

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../../declarations/WebpackOptions").CssGeneratorExportsConvention} CssGeneratorExportsConvention */
/** @typedef {import("../../declarations/WebpackOptions").CssGeneratorLocalIdentName} CssGeneratorLocalIdentName */
/** @typedef {import("../../declarations/WebpackOptions").HashFunction} HashFunction */
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
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<(number | string | Value | Range | boolean | ExportMode | ExportType | DependencyLocation | undefined)[]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<(number | string | Value | Range | boolean | ExportMode | ExportType | DependencyLocation | undefined)[]>} ObjectSerializerContext */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */
/** @typedef {import("../errors/WebpackError")} WebpackErrorType */

/** @typedef {string | [string, string] | [string, string, string]} Value */
/** @typedef {(name: string) => string | string[]} ExportsConventionFn */
// 0 - none, 1 - replace, 2 - append, 3 - once, 4 - self-reference
/** @typedef {0 | 1 | 2 | 3 | 4} ExportMode */
// 0 - normal, 1 - custom css variable, 2 - grid custom ident, 3 - composes
/** @typedef {0 | 1 | 2 | 3} ExportType */

/** @type {Record<"NONE" | "REPLACE" | "APPEND" | "ONCE" | "SELF_REFERENCE", ExportMode>} */
const EXPORT_MODE = {
	NONE: 0,
	REPLACE: 1,
	APPEND: 2,
	ONCE: 3,
	SELF_REFERENCE: 4
};

/** @type {Record<"NORMAL" | "CUSTOM_VARIABLE" | "GRID_CUSTOM_IDENTIFIER" | "COMPOSES", ExportType>} */
const EXPORT_TYPE = {
	NORMAL: 0,
	CUSTOM_VARIABLE: 1,
	GRID_CUSTOM_IDENTIFIER: 2,
	COMPOSES: 3
};

// Hoisted out of `getLocalIdent`'s `prepareId` so the patterns + the replacer
// aren't recompiled/reallocated per interpolated id.
const IDENT_LEADING_INVALID_REGEXP = /^([.-]|[^a-z0-9_-])+/i;
const IDENT_INVALID_CHARS_REGEXP = /[^a-z0-9@_-]+/gi;
const IDENT_LOCAL_PLACEHOLDER_REGEXP = /\[local\]/g;
const IDENT_LEADING_PROTECT_REGEXP = /^((-?\d)|--)/;

/**
 * `interpolate` `prepareId` hook — sanitize an id segment into a valid CSS ident.
 * Pure (captures nothing), so it's shared rather than allocated per call.
 * @param {string | number} id id segment
 * @returns {string | number} sanitized id segment
 */
const prepareLocalIdentId = (id) => {
	if (typeof id !== "string") return id;
	return (
		id
			.replace(IDENT_LEADING_INVALID_REGEXP, "")
			// We keep the `@` symbol because it can be used in the package name (e.g. `@company/package`), and if we replace it with `_`, a class conflict may occur.
			// For example - `@import "@foo/package/style.module.css"` and `@import "foo/package/style.module.css"` (`foo` is a package, `package` is just a directory) will create a class conflict.
			.replace(IDENT_INVALID_CHARS_REGEXP, "_")
	);
};

/**
 * Returns local ident.
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
		(runtimeTemplate.compilation.compiler.context),
		/** @type {string} */
		(module.getResource()),
		runtimeTemplate.compilation.compiler.root
	);
	const { uniqueName } = runtimeTemplate.outputOptions;

	let localIdentHash = "";
	let localIdentHashFull = "";

	if (generator._localIdentNeedsHash) {
		const hashSalt = generator.options.localIdentHashSalt;
		const hashDigest =
			/** @type {string} */
			(generator.options.localIdentHashDigest);
		const hashDigestLength = generator.options.localIdentHashDigestLength;
		const hashFunction =
			/** @type {HashFunction} */
			(generator.options.localIdentHashFunction);

		const hash = createHash(hashFunction);

		if (hashSalt) {
			hash.update(hashSalt);
		}

		if (uniqueName) {
			hash.update(uniqueName);
		}

		hash.update(relativeResourcePath);
		hash.update(local);

		// Keep the untruncated digest so an inline `[fullhash:<digest>]` re-encodes
		// with full entropy (see the `fullHash`/`fullHashDigest` passed below).
		localIdentHashFull = hash.digest(hashDigest);
		localIdentHash = localIdentHashFull.slice(0, hashDigestLength);
	}

	let contentHash = "";

	if (generator._localIdentNeedsContentHash) {
		const hash = createHash(runtimeTemplate.outputOptions.hashFunction);
		const source = module.originalSource();

		if (source) {
			updateHashFromSource(hash, source);
		}

		if (module.error) {
			hash.update(module.error.toString());
		}

		contentHash = digestNonNumericOnly(
			hash,
			/** @type {string} */ (runtimeTemplate.outputOptions.hashDigest),
			/** @type {number} */ (runtimeTemplate.outputOptions.hashDigestLength)
		);
	}

	let localIdent = interpolate(localIdentName, {
		prepareId: prepareLocalIdentId,
		filename: relativeResourcePath,
		hash: localIdentHash,
		// css-loader semantics: `[hash]` is the local ident hash, not the module
		// hash (use `[modulehash]` for that).
		hashAsFullHash: true,
		// `[hash]`/`[contenthash]` are encoded with the output digest, but the
		// `[fullhash]` local ident hash uses `localIdentHashDigest`, so re-encode it
		// from its own (full) digest.
		hashDigest: runtimeTemplate.outputOptions.hashDigest,
		fullHash: localIdentHashFull,
		fullHashDigest:
			/** @type {string} */
			(generator.options.localIdentHashDigest),
		local,
		uniqueName,
		contentHash,
		chunkGraph,
		module
	});

	// TODO move this into interpolate
	// `replace` on a non-matching global regexp returns the string unchanged, so
	// the `.test` guard is redundant — one scan instead of two.
	localIdent = localIdent.replace(IDENT_LOCAL_PLACEHOLDER_REGEXP, local);

	// Protect the first character from unsupported values
	return localIdent.replace(IDENT_LEADING_PROTECT_REGEXP, "_$1");
};

/**
 * Computes the interpolated identifier for `(module, value, exportType)`.
 * Module-level reference so `moduleGraph.cached` can use it as a stable
 * computer key — repeated lookups during a build skip `cssExportConvention`,
 * `getLocalIdent` (with its content / path hashing) and `escapeIdentifier`.
 * @param {ModuleGraph} _moduleGraph module graph (unused, kept for `cached` signature)
 * @param {CssModule} module css module the value resolves in
 * @param {string} value raw value to interpolate
 * @param {ExportType} exportType export type discriminator
 * @param {ChunkGraph} chunkGraph chunk graph
 * @param {RuntimeTemplate} runtimeTemplate runtime template
 * @returns {string} interpolated identifier
 */
const computeInterpolatedIdentifier = (
	_moduleGraph,
	module,
	value,
	exportType,
	chunkGraph,
	runtimeTemplate
) => {
	const generator = /** @type {CssGenerator} */ (module.generator);
	const local = cssExportConvention(
		value,
		/** @type {CssGeneratorExportsConvention} */
		(generator.options.exportsConvention)
	)[0];
	const prefix = exportType === EXPORT_TYPE.CUSTOM_VARIABLE ? "--" : "";
	return (
		prefix +
		getCssTokens().escapeIdentifier(
			getLocalIdent(local, module, chunkGraph, runtimeTemplate),
			runtimeTemplate.compilation.compiler.root
		)
	);
};

/**
 * One `:export { name: value }` style entry — a plain object so a module holds
 * a single `Dependency` plus a flat array instead of thousands of `Dependency`
 * instances. `_conventionNames`/`_valueConventionNames` memoize the convention
 * expansion per entry.
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

class CssIcssExportDependency extends NullDependency {
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
 * Get (or lazily build into `indexCache`) a name -> entries index for `dep`,
 * so composes resolution does a Map lookup instead of scanning all entries per
 * reference. The cache is owned by one `apply` call and GC'd with it.
 * @param {Map<CssIcssExportDependency, Map<string, CssExportEntry[]>>} indexCache transient cache
 * @param {CssIcssExportDependency} dep export dependency
 * @returns {Map<string, CssExportEntry[]>} entries grouped by name
 */
const indexEntries = (indexCache, dep) => {
	let map = indexCache.get(dep);
	if (map === undefined) {
		map = new Map();
		for (const e of dep.entries) {
			const list = map.get(e.name);
			if (list) list.push(e);
			else map.set(e.name, [e]);
		}
		indexCache.set(dep, map);
	}
	return map;
};

/**
 * Finds the active `CssIcssImportDependency` for a given local name. When a
 * `request` is provided the lookup also requires the import dependency's
 * `request` to match, so references between two `@value foo from "..."`
 * declarations resolve through the import in scope at the reference site.
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

CssIcssExportDependency.Template = class CssIcssExportDependencyTemplate extends (
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
	 * @param {Map<CssIcssExportDependency, Map<string, CssExportEntry[]>>=} indexCache transient per-codegen name index (shared with `resolveReferences` within one `apply`)
	 * @returns {string | undefined} found reference
	 */
	static resolve(
		localName,
		importName,
		templateContext,
		request,
		seen = new Set(),
		indexCache = new Map()
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

		/** @type {CssExportEntry | undefined} */
		let exportEntry;
		for (const dep of module.dependencies) {
			if (!(dep instanceof CssIcssExportDependency)) continue;
			const matches = indexEntries(indexCache, dep).get(importName);
			if (matches) {
				exportEntry = matches[0];
				break;
			}
		}
		if (!exportEntry) return undefined;
		if (seen.has(exportEntry)) return undefined;
		seen.add(exportEntry);

		const { value, interpolate } = exportEntry;

		if (Array.isArray(value)) {
			return CssIcssExportDependencyTemplate.resolve(
				value[0],
				value[1],
				{ ...templateContext, module },
				value[2],
				seen,
				indexCache
			);
		}

		if (interpolate) {
			return CssIcssExportDependencyTemplate.getIdentifier(value, exportEntry, {
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
	 * @param {Map<CssIcssExportDependency, Map<string, CssExportEntry[]>>} indexCache transient per-codegen name index, discarded after the module's `apply` (so it isn't retained on the dependency)
	 * @returns {string[]} final names
	 */
	static resolveReferences(entry, templateContext, seen, indexCache) {
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

			// Same overridden context and target name for every matched entry — build once, not per entry.
			const subContext = { ...templateContext, module };
			const name = /** @type {string[]} */ (entry.value)[1];
			for (const dep of module.dependencies) {
				if (!(dep instanceof CssIcssExportDependency)) continue;
				const matches = indexEntries(indexCache, dep).get(name);
				if (!matches) continue;
				for (const d of matches) {
					if (Array.isArray(d.value)) {
						references.push(
							...CssIcssExportDependencyTemplate.resolveReferences(
								d,
								subContext,
								seen,
								indexCache
							)
						);
					} else {
						references.push(
							CssIcssExportDependencyTemplate.getIdentifier(
								d.value,
								d,
								subContext
							)
						);
					}
				}
			}
		} else {
			references.push(
				CssIcssExportDependencyTemplate.getIdentifier(
					/** @type {string} */ (entry.value),
					entry,
					templateContext
				)
			);

			for (const dep of templateContext.module.dependencies) {
				if (!(dep instanceof CssIcssExportDependency)) continue;
				const matches = indexEntries(indexCache, dep).get(
					/** @type {string} */ (entry.value)
				);
				if (!matches) continue;
				for (const d of matches) {
					if (d.exportType !== EXPORT_TYPE.COMPOSES) continue;
					if (Array.isArray(d.value)) {
						references.push(
							...CssIcssExportDependencyTemplate.resolveReferences(
								d,
								templateContext,
								seen,
								indexCache
							)
						);
					} else {
						references.push(
							CssIcssExportDependencyTemplate.getIdentifier(
								d.value,
								d,
								templateContext
							)
						);
					}
				}
			}
		}

		return references.length > 1 ? [...new Set(references)] : references;
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
			computeInterpolatedIdentifier,
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
		const dep = /** @type {CssIcssExportDependency} */ (dependency);
		const { module: m, moduleGraph, runtime, cssData } = templateContext;
		const module = /** @type {CssModule} */ (m);
		const generator = /** @type {CssGenerator} */ (module.generator);
		const isJs = templateContext.type === JAVASCRIPT_TYPE;
		// All entries belong to this one module, so resolve its ExportsInfo once
		// instead of re-resolving `module -> exportsInfo` per export name.
		const exportsInfo = isJs ? moduleGraph.getExportsInfo(module) : undefined;
		// Transient name index for composes resolution within this module's codegen; GC'd when apply returns (never retained on the dependency).
		/** @type {Map<CssIcssExportDependency, Map<string, CssExportEntry[]>>} */
		const indexCache = new Map();

		for (const entry of dep.entries) {
			if (!entry.range && !isJs) continue;
			const isReference = Array.isArray(entry.value);

			/** @type {string} */
			let value;
			if (entry.exportType === EXPORT_TYPE.COMPOSES && isJs) {
				value = CssIcssExportDependencyTemplate.resolveReferences(
					entry,
					templateContext,
					new Set(),
					indexCache
				).join(" ");
			} else if (isReference) {
				const resolved = CssIcssExportDependencyTemplate.resolve(
					/** @type {string[]} */ (entry.value)[0],
					/** @type {string[]} */ (entry.value)[1],
					templateContext,
					/** @type {string[]} */ (entry.value)[2],
					new Set(),
					indexCache
				);
				value = resolved || /** @type {string[]} */ (entry.value)[0];
			} else {
				value = CssIcssExportDependencyTemplate.getIdentifier(
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
					const usedName = /** @type {NonNullable<typeof exportsInfo>} */ (
						exportsInfo
					)
						.getExportInfo(name)
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

/** @type {Record<"NONE" | "REPLACE" | "APPEND" | "ONCE" | "SELF_REFERENCE", ExportMode>} */
CssIcssExportDependency.EXPORT_MODE = EXPORT_MODE;

/** @type {Record<"NORMAL" | "CUSTOM_VARIABLE" | "GRID_CUSTOM_IDENTIFIER" | "COMPOSES", ExportType>} */
CssIcssExportDependency.EXPORT_TYPE = EXPORT_TYPE;

makeSerializable(
	CssIcssExportDependency,
	"webpack/lib/dependencies/CssIcssExportDependency"
);

module.exports = CssIcssExportDependency;
