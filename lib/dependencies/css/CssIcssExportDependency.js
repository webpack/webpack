/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const { cssExportConvention, gridAreaName } = require("../../css/conventions");
const WebpackError = require("../../errors/WebpackError");
const isDependencyKind = require("../../graph/isDependencyKind");
const { JAVASCRIPT_TYPE } = require("../../module/ModuleSourceTypeConstants");
const { interpolate } = require("../../template/TemplatedPathPlugin");
const createHash = require("../../util/createHash");
const { makePathsRelative } = require("../../util/identifier");
const makeSerializable = require("../../util/makeSerializable");
const memoize = require("../../util/memoize");
const { digestNonNumericOnly } = require("../../util/nonNumericOnlyHash");
const { updateHashFromSource } = require("../../util/source");
const NullDependency = require("../core/NullDependency");

const getCssTokens = memoize(() => require("../../css/syntax-parser"));
const getCssData = memoize(() => require("../../css/data"));

/** @import CssIcssImportDependency from "./CssIcssImportDependency" */
/** @import CssUrlDependency from "./CssUrlDependency" */
/** @import { ReplaceSource } from "webpack-sources" */
/**
 * @import {
 * 	CssGeneratorExportsConvention,
 * 	CssGeneratorLocalIdentName,
 * 	HashFunction
 * } from "../../../declarations/WebpackOptions"
 */
/** @import CssGenerator from "../../css/CssGenerator" */
/** @import CssModule from "../../css/CssModule" */
/** @import ChunkGraph from "../../graph/ChunkGraph" */
/**
 * @import Dependency, {
 * 	ExportsSpec,
 * 	ReferencedExports,
 * 	UpdateHashContext,
 * 	DependencyLocation,
 * 	DependencyKinds
 * } from "../../graph/Dependency"
 */
/**
 * @import {
 * 	CssDependencyTemplateContext as DependencyTemplateContext
 * } from "../../template/DependencyTemplate"
 */
/** @import ModuleGraph from "../../graph/ModuleGraph" */
/** @import RuntimeTemplate from "../../template/RuntimeTemplate" */
/** @import { Range } from "../../css/CssParser" */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectDeserializerContext<(number | string | Value | Range | boolean | ExportMode | ExportType | DependencyLocation | string[] | undefined)[]>} ObjectDeserializerContext */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectSerializerContext<(number | string | Value | Range | boolean | ExportMode | ExportType | DependencyLocation | string[] | undefined)[]>} ObjectSerializerContext */
/** @import Hash from "../../util/Hash" */
/** @import { RuntimeSpec } from "../../util/runtime" */
/** @import WebpackErrorType from "../../errors/WebpackError" */

// A reference is `[localName, importName, request?]`; a `RESOLVED_REFERENCE`
// also names the declaration's property, whose keywords stay unscoped.
/** @typedef {string | [string, string] | [string, string, string] | [string, string, string | undefined, string] | [string, string, string | undefined, string, string]} Value */
/** @typedef {(name: string) => string | string[]} ExportsConventionFn */
// 0 - none, 1 - replace, 2 - append, 3 - once, 4 - self-reference, 5 - resolved
// name / 6 - resolved selector (once, keyed by what an imported `@value` names),
// 7 - resolved reference (a property value scoped once it resolves, not exported)
/** @typedef {0 | 1 | 2 | 3 | 4 | 5 | 6 | 7} ExportMode */
// 0 - normal, 1 - custom css variable, 2 - grid custom ident, 3 - composes
/** @typedef {0 | 1 | 2 | 3} ExportType */

/** @type {Record<"NONE" | "REPLACE" | "APPEND" | "ONCE" | "SELF_REFERENCE" | "RESOLVED_NAME" | "RESOLVED_SELECTOR" | "RESOLVED_REFERENCE", ExportMode>} */
const EXPORT_MODE = {
	NONE: 0,
	REPLACE: 1,
	APPEND: 2,
	ONCE: 3,
	SELF_REFERENCE: 4,
	RESOLVED_NAME: 5,
	RESOLVED_SELECTOR: 6,
	RESOLVED_REFERENCE: 7
};

/**
 * Whether an entry is only resolved once its imported `@value` is, so its `name` is no export key.
 * @param {ExportMode} exportMode export mode
 * @returns {boolean} true for the `RESOLVED_*` modes, numbered last
 */
const isResolvedMode = (exportMode) => exportMode >= EXPORT_MODE.RESOLVED_NAME;

/**
 * The warning for a `@value` standing in for a declared name (an at-rule prelude, `local()`) whose value is not one identifier.
 * @param {string} name `@value` name as written
 * @param {string} value what it resolves to
 * @returns {string} warning message
 */
const notSimpleIdentifierMessage = (name, value) =>
	`'@value' '${name}' resolves to '${value}', which is not a single identifier: it is scoped in the CSS but not exported to JavaScript`;

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
 * `interpolate` `prepareId` hook - sanitize an id segment into a valid CSS ident.
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
		runtimeTemplate.compilation.compiler.context,
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
			runtimeTemplate.outputOptions.hashDigest,
			runtimeTemplate.outputOptions.hashDigestLength
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
	// the `.test` guard is redundant - one scan instead of two.
	localIdent = localIdent.replace(IDENT_LOCAL_PLACEHOLDER_REGEXP, local);

	return localIdent;
};

/**
 * Computes the interpolated identifier for `(module, value, exportType)`.
 * Module-level reference so `moduleGraph.cached` can use it as a stable
 * computer key - repeated lookups during a build skip
 * `getLocalIdent` (with its content / path hashing) and `escapeIdentifier`.
 * Parameters are ordered by rising cardinality because `cached` keys a trie on
 * them - see the call site.
 * @param {ModuleGraph} _moduleGraph module graph (unused, kept for `cached` signature)
 * @param {CssModule} module css module the value resolves in
 * @param {ChunkGraph} chunkGraph chunk graph
 * @param {RuntimeTemplate} runtimeTemplate runtime template
 * @param {ExportType} exportType export type discriminator
 * @param {string} value raw value to interpolate
 * @returns {string} interpolated identifier
 */
const computeInterpolatedIdentifier = (
	_moduleGraph,
	module,
	chunkGraph,
	runtimeTemplate,
	exportType,
	value
) => {
	const grid = exportType === EXPORT_TYPE.GRID_CUSTOM_IDENTIFIER;
	// `[local]` is the written name, as in css-loader and lightningcss:
	// `exportsConvention` names only the export keys, or `a-b` and `aB` merge.
	const local = grid ? gridAreaName(value) : value;
	let identifier = getLocalIdent(local, module, chunkGraph, runtimeTemplate);
	// Prefixing grid names with `_` would merge `1` with `_1`.
	if (!grid) {
		identifier = identifier.replace(IDENT_LEADING_PROTECT_REGEXP, "_$1");
	}
	const prefix = exportType === EXPORT_TYPE.CUSTOM_VARIABLE ? "--" : "";
	return (
		prefix +
		getCssTokens().escapeIdentifier(
			identifier,
			runtimeTemplate.compilation.compiler.root
		)
	);
};

/**
 * One `:export { name: value }` style entry - a plain object so a module holds
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
 * @property {number} locStartLine per-export source start line (1-based; flat numbers instead of a nested `DependencyLocation` - entries are per-export hot allocations)
 * @property {number} locStartColumn per-export source start column
 * @property {number} locEndLine per-export source end line
 * @property {number} locEndColumn per-export source end column
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
	 * @param {string[]=} nonSelectorNames the names declared only as something other than a class or an id, which an HTML page never names
	 */
	constructor(entries, nonSelectorNames) {
		super();
		/** @type {CssExportEntry[]} */
		this.entries = entries;
		/** @type {string[] | undefined} the names declared only as something other than a class or an id, left out of an HTML page's names */
		this.nonSelectorNames = nonSelectorNames;
		/** @type {undefined | string} */
		this._hashUpdate = undefined;
		/** @type {undefined | Map<string, CssExportEntry[]>} lazily-built `name -> entries` index, reused across every importer's codegen */
		this._entriesByName = undefined;
	}

	/**
	 * The `entries` grouped by export name, built once and reused. `entries` is
	 * immutable after construction/deserialization, so this stays valid for the
	 * dependency's lifetime (the composes/`@value` target of many importers).
	 * @returns {Map<string, CssExportEntry[]>} entries grouped by export name
	 */
	getEntriesByName() {
		if (this._entriesByName === undefined) {
			/** @type {Map<string, CssExportEntry[]>} */
			const map = new Map();
			for (const e of this.entries) {
				const list = map.get(e.name);
				if (list) list.push(e);
				else map.set(e.name, [e]);
			}
			this._entriesByName = map;
		}
		return this._entriesByName;
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
		/** @type {CssModule[] | undefined} */
		let dependencies;
		for (const entry of this.entries) {
			if (
				entry.exportMode === EXPORT_MODE.NONE ||
				entry.exportMode === EXPORT_MODE.SELF_REFERENCE ||
				entry.exportMode === EXPORT_MODE.RESOLVED_REFERENCE
			) {
				continue;
			}
			if (isResolvedMode(entry.exportMode)) {
				// The name lives in another module, so these exports follow its changes.
				if (dependencies === undefined) dependencies = [];
				const declaration = resolveDeclaration(
					moduleGraph,
					module,
					entry,
					dependencies
				);
				if (declaration === undefined) continue;
				for (const name of cssExportConvention(declaration.name, convention)) {
					exports.push({ name, canMangle: true });
				}
				continue;
			}
			for (const name of entryConventionNames(entry, convention)) {
				exports.push({ name, canMangle: true });
			}
		}

		if (exports.length === 0 && dependencies === undefined) return undefined;
		return { exports, dependencies };
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {ReferencedExports} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		// `composes: foo;` references the composed class, not the composing one.
		// Every other entry mode references the whole exports object, so one such
		// entry subsumes the self-reference names.
		/** @type {ReferencedExports} */
		const referenced = [];
		/** @type {CssGeneratorExportsConvention | undefined} */
		let convention;
		for (const entry of this.entries) {
			if (
				entry.exportMode !== EXPORT_MODE.SELF_REFERENCE ||
				typeof entry.value !== "string"
			) {
				return super.getReferencedExports(moduleGraph, runtime);
			}
			if (convention === undefined) {
				const module =
					/** @type {CssModule} */
					(moduleGraph.getParentModule(this));
				convention =
					/** @type {CssGeneratorExportsConvention} */
					(
						/** @type {CssGenerator} */ (module.generator).options
							.exportsConvention
					);
			}
			for (const name of entryValueConventionNames(entry, convention)) {
				referenced.push({ name: [name], canMangle: true });
			}
		}
		return referenced.length === 0
			? super.getReferencedExports(moduleGraph, runtime)
			: referenced;
	}

	/**
	 * Returns warnings.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {WebpackError[] | null | undefined} warnings
	 */
	getWarnings(moduleGraph) {
		/** @type {WebpackErrorType[] | null} */
		let warnings = null;
		/** @type {CssModule | undefined} */
		let module;
		let exportsInfo;
		let convention;
		for (const entry of this.entries) {
			/** @type {string | undefined} */
			let message;
			if (entry.exportMode === EXPORT_MODE.RESOLVED_NAME) {
				if (module === undefined) {
					module = /** @type {CssModule | undefined} */ (
						moduleGraph.getParentModule(this)
					);
					if (!module) return warnings;
				}
				const text = resolveImportedText(moduleGraph, module, entry);
				if (text === undefined || getCssTokens().isSimpleIdentifier(text)) {
					continue;
				}
				message = notSimpleIdentifierMessage(
					/** @type {string[]} */ (entry.value)[0],
					text
				);
			} else if (
				entry.exportMode === EXPORT_MODE.SELF_REFERENCE &&
				typeof entry.value === "string"
			) {
				if (module === undefined) {
					module = /** @type {CssModule | undefined} */ (
						moduleGraph.getParentModule(this)
					);
					if (!module) return warnings;
				}
				if (exportsInfo === undefined) {
					convention =
						/** @type {CssGeneratorExportsConvention} */
						(
							/** @type {CssGenerator} */ (module.generator).options
								.exportsConvention
						);
					exportsInfo = moduleGraph.getExportsInfo(module);
				}
				const ei = exportsInfo;
				if (
					entryValueConventionNames(
						entry,
						/** @type {CssGeneratorExportsConvention} */ (convention)
					).some((name) => ei.isExportProvided(name))
				) {
					continue;
				}
				message = `Self-referencing name "${entry.value}" not found`;
			} else {
				continue;
			}
			const error = new WebpackError(message);
			error.module = module;
			// Per-entry loc so Compilation attributes the warning precisely (it can't
			// use the consolidated dependency's single loc); entries hold flat numbers.
			if (entry.locStartLine > 0) {
				error.loc = {
					start: { line: entry.locStartLine, column: entry.locStartColumn },
					end: { line: entry.locEndLine, column: entry.locEndColumn }
				};
			}
			if (warnings === null) warnings = [];
			warnings.push(error);
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
				update += `exportsConvention|${JSON.stringify(
					names
				)}|localIdentName|${localIdentName}|value|${JSON.stringify(
					entry.value
				)}|range|${JSON.stringify(entry.range)}|interpolate|${
					entry.interpolate
				}|exportMode|${entry.exportMode}|exportType|${entry.exportType}`;
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
			write(entry.locStartLine);
			write(entry.locStartColumn);
			write(entry.locEndLine);
			write(entry.locEndColumn);
		}
		write(this.nonSelectorNames);
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
				locStartLine: /** @type {number} */ (read()),
				locStartColumn: /** @type {number} */ (read()),
				locEndLine: /** @type {number} */ (read()),
				locEndColumn: /** @type {number} */ (read()),
				_conventionNames: undefined,
				_valueConventionNames: undefined
			});
		}
		this.entries = entries;
		this.nonSelectorNames = /** @type {string[] | undefined} */ (read());
		this._hashUpdate = undefined;
		this._entriesByName = undefined;
		super.deserialize(context);
	}
}

/**
 * Shared read-only index for modules that own no export dep.
 * @type {Map<string, CssExportEntry[]>}
 */
const EMPTY_INDEX = new Map();

/**
 * Per-module export and import indexes, valid while `buildInfo` stays the same object, so each is built once per build for both passes and every importer.
 * Held weakly, so they never keep a module alive.
 * @type {WeakMap<CssModule, { buildInfo: CssModule["buildInfo"], exports: Map<string, CssExportEntry[]> | undefined, imports: Map<string, CssIcssImportDependency[]> | undefined }>}
 */
const moduleIndexes = new WeakMap();

/**
 * Gets the current build's index record for `module`, starting an empty one when the module was rebuilt.
 * @param {CssModule} module css module
 * @returns {{ buildInfo: CssModule["buildInfo"], exports: Map<string, CssExportEntry[]> | undefined, imports: Map<string, CssIcssImportDependency[]> | undefined }} index record
 */
const getModuleIndexes = (module) => {
	const buildInfo = module.buildInfo;
	let record = moduleIndexes.get(module);
	if (record === undefined || record.buildInfo !== buildInfo) {
		record = { buildInfo, exports: undefined, imports: undefined };
		moduleIndexes.set(module, record);
	}
	return record;
};

/**
 * Get the `name -> entries` index for `module`. There is one consolidated
 * `CssIcssExportDependency` per module, which caches its own index, so this only
 * memoizes finding that dep, per build, on the module's index record.
 * @param {CssModule} module css module
 * @returns {Map<string, CssExportEntry[]>} entries grouped by export name
 */
const getExportIndex = (module) => {
	const record = getModuleIndexes(module);
	if (record.exports === undefined) {
		record.exports = EMPTY_INDEX;
		for (const dep of module.dependencies) {
			if (isDependencyKind(dep, "css-icss-export")) {
				record.exports = dep.getEntriesByName();
				break;
			}
		}
	}
	return record.exports;
};

/**
 * Get (or lazily build) the `local name -> import deps` index for `module`, so
 * `findImportDep` is a Map lookup instead of a linear scan of every dependency.
 * Cached per build on the module (validated by `buildInfo` identity) so both the
 * CSS and JS codegen passes reuse one scan of `module.dependencies`.
 * @param {CssModule} module css module
 * @returns {Map<string, CssIcssImportDependency[]>} import deps grouped by local name
 */
const getImportIndex = (module) => {
	const record = getModuleIndexes(module);
	if (record.imports === undefined) {
		/** @type {Map<string, CssIcssImportDependency[]>} */
		const index = new Map();
		for (const d of module.dependencies) {
			if (!isDependencyKind(d, "css-icss-import")) continue;
			const list = index.get(d.localName);
			if (list) list.push(d);
			else index.set(d.localName, [d]);
		}
		record.imports = index;
	}
	return record.imports;
};

/**
 * Finds the active `CssIcssImportDependency` for a given local name. When a
 * `request` is provided the lookup also requires the import dependency's
 * `request` to match, so references between two `@value foo from "..."`
 * declarations resolve through the import in scope at the reference site.
 * @param {CssModule} module module owning the dependencies to search
 * @param {string} localName local name
 * @param {string=} request user request of the `@value` import to match
 * @returns {CssIcssImportDependency | undefined} matching import dep, if any
 */
const findImportDep = (module, localName, request) => {
	const list = getImportIndex(module).get(localName);
	if (list === undefined) return undefined;
	// Import deps keep dependency order, so `list[0]` is the first match (the
	// legacy `firstMatch` fallback when no request-specific match exists).
	if (request === undefined) return list[0];
	for (const d of list) if (d.request === request) return d;
	return list[0];
};

/**
 * Follows a `@value` import, through re-exports, to the entry defining it. Skips demoted (`NONE`) cross-kind entries so it picks the same winner as the JS export map, and `RESOLVED_*` ones, which aren't keyed by their own name.
 * @param {ModuleGraph} moduleGraph module graph
 * @param {CssModule} module module holding the import
 * @param {string} localName local name
 * @param {string} importName import name
 * @param {string | undefined} request user request of the `@value` import
 * @param {Set<CssExportEntry>} seen cycle guard
 * @param {CssModule[]=} visited collects each module the chain passes through
 * @returns {{ entry: CssExportEntry, module: CssModule } | undefined} defining entry and its module
 */
const resolveImportedEntry = (
	moduleGraph,
	module,
	localName,
	importName,
	request,
	seen,
	visited
) => {
	for (;;) {
		const importDep = findImportDep(module, localName, request);
		if (!importDep) return undefined;
		const target = /** @type {CssModule | null} */ (
			moduleGraph.getModule(importDep)
		);
		if (!target) return undefined;
		if (visited) visited.push(target);
		const matches = getExportIndex(target).get(importName);
		let exportEntry;
		if (matches) {
			for (const m of matches) {
				if (
					m.exportMode !== EXPORT_MODE.NONE &&
					!isResolvedMode(m.exportMode)
				) {
					exportEntry = m;
					break;
				}
			}
		}
		if (!exportEntry || seen.has(exportEntry)) return undefined;
		seen.add(exportEntry);
		if (!Array.isArray(exportEntry.value)) {
			return { entry: exportEntry, module: target };
		}
		module = target;
		localName = exportEntry.value[0];
		importName = exportEntry.value[1];
		request = exportEntry.value[2];
	}
};

const VALUE_URL_REGEXP = /^\s*url\(/i;

/**
 * The `url()` dependency of the `@value` a `@value` import resolves to, when its module resolved that value as a URL.
 * @param {ModuleGraph} moduleGraph module graph
 * @param {CssModule} module module with the `@value` import
 * @param {string} localName local name
 * @param {string} importName import name
 * @param {string | undefined} request user request of the `@value` import
 * @returns {CssUrlDependency | undefined} the dependency, which its module owns
 */
const findValueUrlDependency = (
	moduleGraph,
	module,
	localName,
	importName,
	request
) => {
	const target = resolveImportedEntry(
		moduleGraph,
		module,
		localName,
		importName,
		request,
		new Set()
	);
	if (
		!target ||
		target.entry.interpolate ||
		typeof target.entry.value !== "string" ||
		!VALUE_URL_REGEXP.test(target.entry.value)
	) {
		return undefined;
	}
	for (const dep of target.module.dependencies) {
		if (
			isDependencyKind(dep, "css-url") &&
			dep.valueName === target.entry.name
		) {
			return dep;
		}
	}
	return undefined;
};

/**
 * For a use that scopes a name: a plain value naming what its own module scoped (`@value a: b; @keyframes a {}`) resolves to that declaration.
 * @param {{ entry: CssExportEntry, module: CssModule }} target entry a `@value` import resolved to, and its module
 * @returns {{ entry: CssExportEntry, module: CssModule }} the declaration it names there, or `target` itself
 */
const localizeTarget = (target) => {
	if (target.entry.interpolate) return target;
	const declarations = getExportIndex(target.module).get(
		/** @type {string} */ (target.entry.value).trim()
	);
	if (declarations !== undefined) {
		for (const d of declarations) {
			if (
				d.interpolate &&
				d.exportType === EXPORT_TYPE.NORMAL &&
				d.exportMode !== EXPORT_MODE.NONE &&
				!isResolvedMode(d.exportMode) &&
				typeof d.value === "string"
			) {
				return { entry: d, module: target.module };
			}
		}
	}
	return target;
};

/**
 * Follows a grid name's `@value` import to the grid name it selects in the defining module, falling back to the implicit area or line it pairs with (`a-start` to area `a`, `a` to line `a-start`); a line the parser routed through an import that is no grid name stays local.
 * @param {ModuleGraph} moduleGraph module graph
 * @param {CssModule} module module holding the import
 * @param {CssExportEntry} entry grid entry whose value is `[localName, importName, request?]`
 * @returns {{ entry: CssExportEntry | undefined, module: CssModule, name: string } | undefined} defining grid entry, its module and the name selected there; no entry for text inlined as is
 */
const resolveGridReference = (moduleGraph, module, entry) => {
	const [localName, importName, request, property, suffix = ""] =
		/** @type {string[]} */ (entry.value);
	const area = gridAreaName(importName);
	const candidates =
		area !== importName
			? [importName, area]
			: [importName, `${importName}-start`, `${importName}-end`];
	for (const candidate of candidates) {
		const target = resolveImportedEntry(
			moduleGraph,
			module,
			localName,
			candidate,
			request,
			new Set()
		);
		if (
			target !== undefined &&
			target.entry.exportType === EXPORT_TYPE.GRID_CUSTOM_IDENTIFIER
		) {
			return {
				entry: target.entry,
				module: target.module,
				// The defining module's area, then the `-start` / `-end` the import and a local line of it add.
				name:
					gridAreaName(target.entry.name) +
					importName.slice(area.length) +
					suffix
			};
		}
	}
	// `x-start` follows `@value x` only when `x` is a grid name; otherwise it
	// is its own name, scoped here like any other.
	if (suffix !== "") return { entry, module, name: entry.name };
	const target = resolveImportedEntry(
		moduleGraph,
		module,
		localName,
		importName,
		request,
		new Set()
	);
	if (target === undefined || target.entry.interpolate) return undefined;
	// A plain `@value` inlines as if written here: a name scopes here, while a
	// keyword of the property or a non-name stays text (`entry` undefined).
	const text = /** @type {string} */ (target.entry.value).trim();
	const keywords = getCssData().getCssModulesKeywords().get(property);
	return getCssTokens().isSimpleIdentifier(text) &&
		!(keywords !== undefined && keywords.has(text.toLowerCase()))
		? { entry, module, name: text }
		: { entry: undefined, module, name: text };
};

/**
 * The text a `RESOLVED_NAME` entry's imported `@value` resolves to, when the defining module holds it as a plain value rather than a name it scoped itself.
 * @param {ModuleGraph} moduleGraph module graph
 * @param {CssModule} module module owning the entry
 * @param {CssExportEntry} entry entry whose value is `[localName, importName, request?]`
 * @param {CssModule[]=} visited collects each module the chain passes through
 * @returns {string | undefined} the trimmed plain value, if any
 */
const resolveImportedText = (moduleGraph, module, entry, visited) => {
	const value = /** @type {string[]} */ (entry.value);
	let target = resolveImportedEntry(
		moduleGraph,
		module,
		value[0],
		value[1],
		value[2],
		new Set(),
		visited
	);
	if (target === undefined) return undefined;
	target = localizeTarget(target);
	if (target.entry.interpolate) return undefined;
	return /** @type {string} */ (target.entry.value).trim();
};

/**
 * What a `RESOLVED_*` entry scopes once its import resolves to a plain value, as a local `@value` would: one ident, or for a selector one `.class` / `#id`. Anything else is substituted verbatim.
 * @param {ModuleGraph} moduleGraph module graph
 * @param {CssModule} module module owning the entry
 * @param {CssExportEntry} entry `RESOLVED_*` entry
 * @param {CssModule[]=} visited collects each module the chain passes through
 * @returns {{ prefix: string, name: string } | undefined} selector prefix (empty for a name) and the ident to scope
 */
const resolveDeclaration = (moduleGraph, module, entry, visited) => {
	const text = resolveImportedText(moduleGraph, module, entry, visited);
	return text === undefined ? undefined : parseDeclaration(entry, text);
};

/**
 * What a `RESOLVED_*` entry scopes for the plain value its import resolved to: one ident, or for a selector one `.class` / `#id`.
 * @param {CssExportEntry} entry `RESOLVED_*` entry
 * @param {string} text trimmed plain value
 * @returns {{ prefix: string, name: string } | undefined} selector prefix (empty for a name) and the ident to scope
 */
const parseDeclaration = (entry, text) => {
	const { isSimpleIdentifier } = getCssTokens();
	if (entry.exportMode === EXPORT_MODE.RESOLVED_SELECTOR) {
		const prefix = text.charAt(0);
		return (prefix === "." || prefix === "#") &&
			isSimpleIdentifier(text.slice(1))
			? { prefix, name: text.slice(1) }
			: undefined;
	}
	return isSimpleIdentifier(text) ? { prefix: "", name: text } : undefined;
};

/**
 * Whether a `RESOLVED_REFERENCE` resolves to a keyword of its property (`linear` in `animation`), which stays text even where its defining module scoped that name.
 * @param {CssExportEntry} entry entry
 * @param {string} text trimmed plain value the import resolved to
 * @returns {boolean} true for a keyword reference
 */
const isReferenceKeyword = (entry, text) => {
	if (entry.exportMode !== EXPORT_MODE.RESOLVED_REFERENCE) return false;
	const keywords = getCssData()
		.getCssModulesKeywords()
		.get(/** @type {string[]} */ (entry.value)[3]);
	return keywords !== undefined && keywords.has(text.toLowerCase());
};

/**
 * Builds the scoped name of a grid area or line: the area's scoped ident, then what the line adds. A `localIdentName` ending in `[local]` already ends in the area, so only `-start` / `-end` follow; otherwise the whole name does, to keep the pairing.
 * @param {string} name grid area or line name, in the module it is scoped in
 * @param {CssExportEntry} entry grid entry carrying the scoping
 * @param {DependencyTemplateContext} templateContext context of the module the name is scoped in
 * @returns {string} scoped grid name
 */
const gridIdentifier = (name, entry, templateContext) => {
	let identifier = CssIcssExportDependency.Template.getIdentifier(
		name,
		entry,
		templateContext
	);
	const { localIdentName } = /** @type {CssGenerator} */ (
		/** @type {CssModule} */ (templateContext.module).generator
	).options;
	if (
		entry.interpolate &&
		typeof localIdentName === "string" &&
		localIdentName.endsWith("[local]")
	) {
		identifier += name.slice(gridAreaName(name).length);
	} else {
		identifier += `-${getCssTokens().escapeIdentifier(
			name,
			templateContext.runtimeTemplate.compilation.compiler.root
		)}`;
	}
	return getCssTokens().terminateIdentifier(identifier);
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
	 * @param {CssExportEntry=} scopeEntry entry to scope a plain imported value under, for a reference in a localized position
	 * @param {boolean=} localized whether the use scopes a name, so a value naming its own module's declaration resolves to it
	 * @returns {string | undefined} found reference
	 */
	static resolve(
		localName,
		importName,
		templateContext,
		request,
		seen = new Set(),
		scopeEntry = undefined,
		localized = scopeEntry !== undefined
	) {
		let target = resolveImportedEntry(
			templateContext.moduleGraph,
			/** @type {CssModule} */ (templateContext.module),
			localName,
			importName,
			request,
			seen
		);
		if (!target) return undefined;
		if (localized) target = localizeTarget(target);
		const { entry: exportEntry, module } = target;
		const value = /** @type {string} */ (exportEntry.value);
		if (exportEntry.interpolate) {
			const targetContext = { ...templateContext, module };
			// A grid name inlines as its module scoped it, suffix included.
			return exportEntry.exportType === EXPORT_TYPE.GRID_CUSTOM_IDENTIFIER
				? gridIdentifier(value, exportEntry, targetContext)
				: CssIcssExportDependencyTemplate.getIdentifier(
						value,
						exportEntry,
						targetContext
					);
		}
		// A plain value scopes in the importing module, as a local `@value` would.
		if (scopeEntry !== undefined) {
			return CssIcssExportDependencyTemplate.getIdentifier(
				value,
				scopeEntry,
				templateContext
			);
		}
		return value;
	}

	/**
	 * Every module a `@value` or `composes` import passes through to the module defining the name.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {CssModule} module module with the import
	 * @param {string} localName local name
	 * @param {string} importName import name
	 * @param {string | undefined} request user request of the import
	 * @returns {CssModule[]} the modules, in chain order
	 */
	static resolveModules(moduleGraph, module, localName, importName, request) {
		/** @type {CssModule[]} */
		const visited = [];
		resolveImportedEntry(
			moduleGraph,
			module,
			localName,
			importName,
			request,
			new Set(),
			visited
		);
		return visited;
	}

	/**
	 * The `url()` dependency an imported `@value` stands for, when the module defining it resolved it as a URL.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {CssModule} module module with the `@value` import
	 * @param {string} localName local name
	 * @param {string} importName import name
	 * @param {string | undefined} request user request of the `@value` import
	 * @returns {CssUrlDependency | undefined} the dependency, which the defining module owns
	 */
	static resolveUrl(moduleGraph, module, localName, importName, request) {
		return findValueUrlDependency(
			moduleGraph,
			module,
			localName,
			importName,
			request
		);
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
				/** @type {CssModule} */ (templateContext.module),
				entry.value[0],
				entry.value[2]
			);
			if (!importDep) return references;

			const module = /** @type {CssModule | null} */ (
				templateContext.moduleGraph.getModule(importDep)
			);
			if (!module) return references;

			// Same overridden context and target name for every matched entry - build once, not per entry.
			const subContext = { ...templateContext, module };
			const name = /** @type {string[]} */ (entry.value)[1];
			const matches = getExportIndex(module).get(name);
			if (matches) {
				for (const d of matches) {
					if (
						d.exportMode === EXPORT_MODE.NONE ||
						isResolvedMode(d.exportMode)
					) {
						continue;
					}
					if (Array.isArray(d.value) || d.exportType === EXPORT_TYPE.COMPOSES) {
						references.push(
							...CssIcssExportDependencyTemplate.resolveReferences(
								d,
								subContext,
								seen
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
					entry.value,
					entry,
					templateContext
				)
			);

			const matches = getExportIndex(
				/** @type {CssModule} */ (templateContext.module)
			).get(entry.value);
			if (matches) {
				for (const d of matches) {
					if (d.exportMode === EXPORT_MODE.NONE) continue;
					if (d.exportType !== EXPORT_TYPE.COMPOSES) continue;
					references.push(
						...CssIcssExportDependencyTemplate.resolveReferences(
							d,
							templateContext,
							seen
						)
					);
				}
			}
		}

		return references.length > 1 ? [...new Set(references)] : references;
	}

	/**
	 * Records what a class or id name becomes, keyed by its name in the source
	 * (not an `exportsConvention` spelling): what an HTML `class` names. Merged
	 * the way the JS exports are, so `composes` adds the names it pulls in.
	 * @param {Map<string, string>} locals local name -> scoped names
	 * @param {CssExportEntry} entry export entry
	 * @param {string} value the scoped name (or names), as the CSS escapes it
	 * @param {DependencyTemplateContext} templateContext template context
	 */
	static addLocal(locals, entry, value, templateContext) {
		const unescaped = getCssTokens().unescapeIdentifier(
			value,
			templateContext.runtimeTemplate.compilation.compiler.root
		);
		const { name } = entry;
		if (entry.exportMode === EXPORT_MODE.ONCE) {
			if (!locals.has(name)) locals.set(name, unescaped);
			return;
		}
		const original =
			entry.exportMode === EXPORT_MODE.REPLACE ? undefined : locals.get(name);
		locals.set(
			name,
			`${original ? `${original}${unescaped ? " " : ""}` : ""}${unescaped}`
		);
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
		// Keys are ordered by rising cardinality, since `moduleGraph.cached` is a
		// trie allocating a node per level per prefix: the per-export `value` last,
		// or every name forks the trie above the parts constant for the build.
		return moduleGraph.cached(
			computeInterpolatedIdentifier,
			/** @type {CssModule} */ (module),
			chunkGraph,
			runtimeTemplate,
			entry.exportType,
			value
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
		// The local names an HTML page's `class` and `id` are rewritten with,
		// collected outside JS because the page never asks for them by export.
		const locals = isJs ? undefined : cssData.locals;
		/** @type {Set<string> | undefined} */
		const nonSelectorNames =
			locals !== undefined && dep.nonSelectorNames !== undefined
				? new Set(dep.nonSelectorNames)
				: undefined;

		for (const entry of dep.entries) {
			// `composes` has no range in the CSS, so it is resolved for the page only.
			if (
				locals !== undefined &&
				entry.exportType === EXPORT_TYPE.COMPOSES &&
				entry.exportMode !== EXPORT_MODE.NONE &&
				(nonSelectorNames === undefined || !nonSelectorNames.has(entry.name))
			) {
				CssIcssExportDependencyTemplate.addLocal(
					locals,
					entry,
					CssIcssExportDependencyTemplate.resolveReferences(
						entry,
						templateContext,
						new Set()
					).join(" "),
					templateContext
				);
			}
			// Resolve only what this pass emits: JS exports all but demoted names and
			// bare references; CSS rewrites a range, except the composes it drops.
			if (
				isJs
					? entry.exportMode === EXPORT_MODE.NONE ||
						entry.exportMode === EXPORT_MODE.RESOLVED_REFERENCE
					: !entry.range || entry.exportType === EXPORT_TYPE.COMPOSES
			) {
				continue;
			}
			const isReference = Array.isArray(entry.value);

			/** @type {string} */
			let value;
			/** @type {{ prefix: string, name: string } | undefined} */
			let declaration;
			/** @type {ReturnType<typeof resolveGridReference>} */
			let gridReference;
			if (entry.exportType === EXPORT_TYPE.COMPOSES) {
				value = CssIcssExportDependencyTemplate.resolveReferences(
					entry,
					templateContext,
					new Set()
				).join(" ");
			} else if (isResolvedMode(entry.exportMode)) {
				const [localName, importName, request] = /** @type {string[]} */ (
					entry.value
				);
				let target = resolveImportedEntry(
					moduleGraph,
					module,
					localName,
					importName,
					request,
					new Set()
				);
				// A keyword stays text; anything else may name what its module scoped.
				if (
					target !== undefined &&
					(target.entry.interpolate ||
						!isReferenceKeyword(
							entry,
							/** @type {string} */ (target.entry.value).trim()
						))
				) {
					target = localizeTarget(target);
					if (!target.entry.interpolate) {
						declaration = parseDeclaration(
							entry,
							/** @type {string} */ (target.entry.value).trim()
						);
					}
				}
				const text =
					target === undefined
						? undefined
						: /** @type {string} */ (target.entry.value);
				value =
					(target === undefined
						? undefined
						: declaration !== undefined
							? CssIcssExportDependencyTemplate.getIdentifier(
									declaration.name,
									entry,
									templateContext
								)
							: target.entry.interpolate
								? // A grid name inlines as its module scoped it, as `resolve` does.
									target.entry.exportType === EXPORT_TYPE.GRID_CUSTOM_IDENTIFIER
									? gridIdentifier(/** @type {string} */ (text), target.entry, {
											...templateContext,
											module: target.module
										})
									: CssIcssExportDependencyTemplate.getIdentifier(
											/** @type {string} */ (text),
											target.entry,
											{ ...templateContext, module: target.module }
										)
								: // A declared name is still scoped, as a local `@value` is.
									entry.exportMode === EXPORT_MODE.RESOLVED_NAME
									? CssIcssExportDependencyTemplate.getIdentifier(
											/** @type {string} */ (text),
											entry,
											templateContext
										)
									: text) || localName;
			} else if (
				isReference &&
				entry.exportType === EXPORT_TYPE.GRID_CUSTOM_IDENTIFIER &&
				(gridReference = resolveGridReference(moduleGraph, module, entry)) !==
					undefined
			) {
				value =
					gridReference.entry === undefined
						? gridReference.name
						: gridIdentifier(gridReference.name, gridReference.entry, {
								...templateContext,
								module: gridReference.module
							});
			} else if (isReference) {
				const localName = /** @type {string[]} */ (entry.value)[0];
				const resolved = CssIcssExportDependencyTemplate.resolve(
					localName,
					/** @type {string[]} */ (entry.value)[1],
					templateContext,
					/** @type {string[]} */ (entry.value)[2],
					new Set(),
					entry.interpolate && entry.exportType === EXPORT_TYPE.NORMAL
						? entry
						: undefined
				);
				value = resolved || localName;
				if (entry.exportType === EXPORT_TYPE.GRID_CUSTOM_IDENTIFIER) {
					// An import no grid name answers keeps the written name as its suffix.
					value += `-${getCssTokens().escapeIdentifier(
						localName,
						templateContext.runtimeTemplate.compilation.compiler.root
					)}`;
				}
			} else {
				value =
					entry.exportType === EXPORT_TYPE.GRID_CUSTOM_IDENTIFIER
						? gridIdentifier(
								/** @type {string} */ (entry.value),
								entry,
								templateContext
							)
						: CssIcssExportDependencyTemplate.getIdentifier(
								/** @type {string} */ (entry.value),
								entry,
								templateContext
							);
			}

			// The name the CSS is rewritten with, kept for the page's markup. One
			// scoped but not exported (an attribute selector's) names it once.
			if (
				locals !== undefined &&
				entry.exportType === EXPORT_TYPE.NORMAL &&
				!isResolvedMode(entry.exportMode) &&
				(nonSelectorNames === undefined || !nonSelectorNames.has(entry.name))
			) {
				if (entry.exportMode !== EXPORT_MODE.NONE) {
					CssIcssExportDependencyTemplate.addLocal(
						locals,
						entry,
						value,
						templateContext
					);
				} else if (!locals.has(entry.name)) {
					locals.set(
						entry.name,
						getCssTokens().unescapeIdentifier(
							value,
							templateContext.runtimeTemplate.compilation.compiler.root
						)
					);
				}
			}

			if (isJs) {
				const convention =
					/** @type {CssGeneratorExportsConvention} */
					(generator.options.exportsConvention);
				const names = !isResolvedMode(entry.exportMode)
					? entryConventionNames(entry, convention)
					: declaration !== undefined
						? cssExportConvention(declaration.name, convention)
						: [];
				const once =
					entry.exportMode === EXPORT_MODE.ONCE ||
					isResolvedMode(entry.exportMode);
				/** @type {string | undefined} */
				let unescaped;
				// Convention names are already distinct, so each is visited once.
				for (const name of names) {
					if (
						!(
							/** @type {NonNullable<typeof exportsInfo>} */ (exportsInfo)
								.getExportInfo(name)
								.getUsedName(name, runtime)
						)
					) {
						continue;
					}
					if (unescaped === undefined) {
						unescaped = getCssTokens().unescapeIdentifier(
							value,
							templateContext.runtimeTemplate.compilation.compiler.root
						);
					}
					if (once) {
						if (cssData.exports.has(name)) continue;
						cssData.exports.set(name, unescaped);
					} else {
						const originalValue =
							entry.exportMode === EXPORT_MODE.REPLACE
								? undefined
								: cssData.exports.get(name);
						cssData.exports.set(
							name,
							`${
								originalValue ? `${originalValue}${unescaped ? " " : ""}` : ""
							}${unescaped}`
						);
					}
					if (
						entry.locStartLine > 0 &&
						cssData.exportLocs &&
						!cssData.exportLocs.has(name)
					) {
						cssData.exportLocs.set(name, {
							line: entry.locStartLine,
							column: entry.locStartColumn
						});
					}
				}
			} else {
				// The range replaced takes the terminator of an escape the name ended
				// in, so one the new name ends in needs its own.
				const written = getCssTokens().terminateIdentifier(value);
				// A resolved `.class` / `#id` keeps its prefix in the CSS only.
				source.replace(
					/** @type {Range} */ (entry.range)[0],
					/** @type {Range} */ (entry.range)[1] - 1,
					declaration !== undefined && declaration.prefix !== ""
						? declaration.prefix + written
						: written
				);
			}
		}
	}
};

/** @type {Record<"NONE" | "REPLACE" | "APPEND" | "ONCE" | "SELF_REFERENCE" | "RESOLVED_NAME" | "RESOLVED_SELECTOR" | "RESOLVED_REFERENCE", ExportMode>} */
CssIcssExportDependency.EXPORT_MODE = EXPORT_MODE;

CssIcssExportDependency.notSimpleIdentifierMessage = notSimpleIdentifierMessage;

/** @type {Record<"NORMAL" | "CUSTOM_VARIABLE" | "GRID_CUSTOM_IDENTIFIER" | "COMPOSES", ExportType>} */
CssIcssExportDependency.EXPORT_TYPE = EXPORT_TYPE;

makeSerializable(CssIcssExportDependency, [
	"webpack/lib/dependencies/css/CssIcssExportDependency",
	// TODO in the next major release: remove, they restore pre-move cache packs
	"webpack/lib/dependencies/CssIcssExportDependency"
]);

/** @type {Set<keyof DependencyKinds>} */
CssIcssExportDependency.KINDS = new Set([
	...NullDependency.KINDS,
	"css-icss-export"
]);

module.exports = CssIcssExportDependency;
