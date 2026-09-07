/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/** @import { RawSourceMap } from "webpack-sources" */
/** @import ModuleGraph from "../ModuleGraph" */

/**
 * A source map that can carry the `scopes` field of the proposal, which
 * webpack-sources does not describe yet.
 * @typedef {RawSourceMap & { scopes?: string }} ScopedSourceMap
 */

/**
 * A generated or original position, both counted from zero.
 * @typedef {object} ScopePosition
 * @property {number} line line
 * @property {number} column column
 */

/**
 * One source's scope, and the span of generated code it explains.
 * @typedef {object} SourceScope
 * @property {number} sourceIndex index into the map's `sources`
 * @property {string[]} variables the names the source declares
 * @property {string[]} values the generated expression each name evaluates to
 * @property {ScopePosition} originalEnd end of the original scope, exclusive
 * @property {ScopePosition[]} rangeStarts start of each generated range, inclusive
 * @property {ScopePosition[]} rangeEnds end of each generated range, exclusive
 */

const BASE64_CHARS =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const BASE64_VALUES = new Int8Array(128).fill(-1);
for (let index = 0; index < BASE64_CHARS.length; index++) {
	BASE64_VALUES[BASE64_CHARS.charCodeAt(index)] = index;
}

const VLQ_BASE_SHIFT = 5;
const VLQ_BASE_MASK = (1 << VLQ_BASE_SHIFT) - 1;
const VLQ_CONTINUATION_BIT = 1 << VLQ_BASE_SHIFT;

// Item tags of the "Scopes" proposal, base64 digits of their numeric values.
const TAG_EMPTY = "A";
const TAG_ORIGINAL_SCOPE_START = "B";
const TAG_ORIGINAL_SCOPE_END = "C";
const TAG_ORIGINAL_SCOPE_VARIABLES = "D";
const TAG_GENERATED_RANGE_START = "E";
const TAG_GENERATED_RANGE_END = "F";
const TAG_GENERATED_RANGE_BINDINGS = "G";

const ORIGINAL_SCOPE_FLAG_HAS_KIND = 0x2;
const GENERATED_RANGE_FLAG_HAS_LINE = 0x1;
const GENERATED_RANGE_FLAG_HAS_DEFINITION = 0x2;

/**
 * Every scope webpack emits describes one module, which the proposal's
 * JavaScript vocabulary calls a module scope.
 */
const MODULE_SCOPE_KIND = "Module";

/**
 * @param {number} value non-negative value
 * @returns {string} base64 VLQ digits
 */
const encodeUnsigned = (value) => {
	let result = "";
	let rest = value;
	for (;;) {
		const digit = rest & VLQ_BASE_MASK;
		rest >>>= VLQ_BASE_SHIFT;
		if (rest === 0) return result + BASE64_CHARS[digit];
		result += BASE64_CHARS[VLQ_CONTINUATION_BIT + digit];
	}
};

/**
 * @param {number} value value of either sign
 * @returns {string} base64 VLQ digits
 */
const encodeSigned = (value) =>
	encodeUnsigned(value >= 0 ? 2 * value : 1 - 2 * value);

/**
 * Walks the map's segments in generated order, reporting each one's source and
 * original line. A segment with no source position reports `sourceIndex` -1,
 * which ends whatever run precedes it.
 * @param {string} mappings the map's `mappings` field
 * @param {(generatedLine: number, generatedColumn: number, sourceIndex: number, originalLine: number) => void} onSegment called per segment
 * @returns {number} the last generated line the mappings reach
 */
const forEachMapping = (mappings, onSegment) => {
	let generatedLine = 0;
	let generatedColumn = 0;
	let sourceIndex = 0;
	let originalLine = 0;
	let position = 0;
	const length = mappings.length;
	/** @type {number[]} */
	const fields = [];
	while (position < length) {
		const char = mappings.charCodeAt(position);
		if (char === 59 /* ; */) {
			generatedLine++;
			generatedColumn = 0;
			position++;
			continue;
		}
		if (char === 44 /* , */) {
			position++;
			continue;
		}
		fields.length = 0;
		while (position < length) {
			const next = mappings.charCodeAt(position);
			if (next === 59 || next === 44) break;
			let value = 0;
			let shift = 0;
			let digit;
			do {
				digit = BASE64_VALUES[mappings.charCodeAt(position++)];
				// A digit outside the alphabet cannot be recovered from, and
				// pretending otherwise would misplace every later segment.
				if (digit < 0) return generatedLine;
				value += (digit & VLQ_BASE_MASK) << shift;
				shift += VLQ_BASE_SHIFT;
			} while (digit & VLQ_CONTINUATION_BIT);
			fields.push(value & 1 ? -(value >>> 1) : value >>> 1);
		}
		if (fields.length === 0) continue;
		generatedColumn += fields[0];
		if (fields.length >= 4) {
			sourceIndex += fields[1];
			originalLine += fields[2];
			onSegment(generatedLine, generatedColumn, sourceIndex, originalLine);
		} else {
			onSegment(generatedLine, generatedColumn, -1, -1);
		}
	}
	return generatedLine;
};

/**
 * Groups the map's segments into one entry per source, holding the generated
 * runs that source explains and how far into it the map reaches.
 * @param {string} mappings the map's `mappings` field
 * @param {number} sourceCount number of entries in the map's `sources`
 * @returns {SourceScope[]} one entry per source that the mappings reach, in source order
 */
const collectSourceScopes = (mappings, sourceCount) => {
	/** @type {(SourceScope | undefined)[]} */
	const scopes = Array.from({ length: sourceCount });
	let openSource = -1;
	/** @type {SourceScope | undefined} */
	let openScope;
	/**
	 * @param {number} line generated line the run ends at
	 * @param {number} column generated column the run ends at
	 */
	const closeRun = (line, column) => {
		if (openScope === undefined) return;
		openScope.rangeEnds.push({ line, column });
		openScope = undefined;
		openSource = -1;
	};
	const lastLine = forEachMapping(
		mappings,
		(generatedLine, generatedColumn, sourceIndex, originalLine) => {
			if (sourceIndex === openSource) {
				/** @type {SourceScope} */
				(openScope).originalEnd.line = Math.max(
					/** @type {SourceScope} */ (openScope).originalEnd.line,
					originalLine + 1
				);
				return;
			}
			closeRun(generatedLine, generatedColumn);
			if (sourceIndex < 0 || sourceIndex >= sourceCount) return;
			let scope = scopes[sourceIndex];
			if (scope === undefined) {
				scope = {
					sourceIndex,
					variables: [],
					values: [],
					originalEnd: { line: originalLine + 1, column: 0 },
					rangeStarts: [],
					rangeEnds: []
				};
				scopes[sourceIndex] = scope;
			} else {
				scope.originalEnd.line = Math.max(
					scope.originalEnd.line,
					originalLine + 1
				);
			}
			scope.rangeStarts.push({ line: generatedLine, column: generatedColumn });
			openScope = scope;
			openSource = sourceIndex;
		}
	);
	closeRun(lastLine + 1, 0);
	return /** @type {SourceScope[]} */ (scopes.filter(Boolean));
};

/**
 * Encodes the scope tree into the `scopes` field of the proposal, appending any
 * name it needs to the map's `names`.
 * @param {SourceScope[]} scopes the scopes to encode, in source order
 * @param {number} sourceCount number of entries in the map's `sources`
 * @param {string[]} names the map's `names`, extended in place
 * @returns {string} the encoded `scopes` field
 */
const encodeScopes = (scopes, sourceCount, names) => {
	/** @type {Map<string, number>} */
	const nameToIndex = new Map();
	for (let index = 0; index < names.length; index++) {
		if (!nameToIndex.has(names[index])) nameToIndex.set(names[index], index);
	}
	/**
	 * @param {string} name the name to resolve
	 * @returns {number} its index in `names`
	 */
	const nameIndex = (name) => {
		const existing = nameToIndex.get(name);
		if (existing !== undefined) return existing;
		const added = names.length;
		names.push(name);
		nameToIndex.set(name, added);
		return added;
	};

	/** @type {Map<number, SourceScope>} */
	const scopeBySource = new Map();
	for (const scope of scopes) scopeBySource.set(scope.sourceIndex, scope);

	/** @type {string[]} */
	const items = [];
	// The three running indices the proposal encodes names and definitions
	// against. Only the position pair restarts per source.
	let lastKind = 0;
	let lastVariable = 0;
	let lastDefinition = 0;
	let scopeCount = 0;
	/** @type {Map<number, number>} */
	const scopeIndexBySource = new Map();

	for (let sourceIndex = 0; sourceIndex < sourceCount; sourceIndex++) {
		const scope = scopeBySource.get(sourceIndex);
		if (scope === undefined || scope.variables.length === 0) {
			items.push(TAG_EMPTY);
			continue;
		}
		const kind = nameIndex(MODULE_SCOPE_KIND);
		items.push(
			TAG_ORIGINAL_SCOPE_START +
				encodeUnsigned(ORIGINAL_SCOPE_FLAG_HAS_KIND) +
				encodeUnsigned(0) +
				encodeUnsigned(0) +
				encodeSigned(kind - lastKind)
		);
		lastKind = kind;
		let variables = TAG_ORIGINAL_SCOPE_VARIABLES;
		for (const variable of scope.variables) {
			const index = nameIndex(variable);
			variables += encodeSigned(index - lastVariable);
			lastVariable = index;
		}
		items.push(variables);
		items.push(
			TAG_ORIGINAL_SCOPE_END +
				encodeUnsigned(scope.originalEnd.line) +
				encodeUnsigned(scope.originalEnd.column)
		);
		scopeIndexBySource.set(sourceIndex, scopeCount++);
	}

	/** @type {{ start: ScopePosition, end: ScopePosition, scope: SourceScope }[]} */
	const ranges = [];
	for (const scope of scopes) {
		if (!scopeIndexBySource.has(scope.sourceIndex)) continue;
		for (let index = 0; index < scope.rangeStarts.length; index++) {
			ranges.push({
				start: scope.rangeStarts[index],
				end: scope.rangeEnds[index],
				scope
			});
		}
	}
	ranges.sort(
		(a, b) => a.start.line - b.start.line || a.start.column - b.start.column
	);

	let lastLine = 0;
	let lastColumn = 0;
	/**
	 * Encodes a position against the running one, reporting whether it needed a
	 * line of its own. A line is only carried when it moved forward, and then
	 * the column is absolute rather than relative.
	 * @param {ScopePosition} position the position to encode
	 * @returns {[boolean, string]} whether a line is carried, and the digits
	 */
	const encodePosition = (position) => {
		const line = position.line - lastLine;
		const carriesLine = line > 0;
		const column = carriesLine ? position.column : position.column - lastColumn;
		lastLine = position.line;
		lastColumn = position.column;
		return [
			carriesLine,
			(carriesLine ? encodeUnsigned(line) : "") + encodeUnsigned(column)
		];
	};

	for (const { start, end, scope } of ranges) {
		const definition =
			/** @type {number} */
			(scopeIndexBySource.get(scope.sourceIndex));
		const [startCarriesLine, startDigits] = encodePosition(start);
		items.push(
			TAG_GENERATED_RANGE_START +
				encodeUnsigned(
					GENERATED_RANGE_FLAG_HAS_DEFINITION |
						(startCarriesLine ? GENERATED_RANGE_FLAG_HAS_LINE : 0)
				) +
				startDigits +
				encodeSigned(definition - lastDefinition)
		);
		lastDefinition = definition;
		let bindings = TAG_GENERATED_RANGE_BINDINGS;
		for (const value of scope.values) {
			bindings += encodeUnsigned(value === "" ? 0 : nameIndex(value) + 1);
		}
		items.push(bindings);
		// An end item carries no flags: one digit is a column, two a line and a
		// column, which is what tells the reader whether the line moved.
		items.push(TAG_GENERATED_RANGE_END + encodePosition(end)[1]);
	}
	return items.join(",");
};

/**
 * Adds the `scopes` field of the "Scopes" proposal to a source map, naming for
 * each source the bindings a debugger cannot resolve on its own and the
 * generated expression each one evaluates to. Does nothing when no source
 * contributes a binding.
 * @param {ScopedSourceMap} sourceMap the map to extend in place
 * @param {(sourceIndex: number) => Map<string, string> | undefined} getBindings binding expressions per source
 * @returns {void}
 */
const addScopesToSourceMap = (sourceMap, getBindings) => {
	if (!sourceMap.mappings || !sourceMap.sources) return;
	const sourceCount = sourceMap.sources.length;
	const scopes = collectSourceScopes(sourceMap.mappings, sourceCount);
	let any = false;
	for (const scope of scopes) {
		const bindings = getBindings(scope.sourceIndex);
		if (bindings === undefined || bindings.size === 0) continue;
		for (const [name, value] of bindings) {
			scope.variables.push(name);
			scope.values.push(value);
		}
		any = true;
	}
	if (!any) return;
	const names = sourceMap.names || (sourceMap.names = []);
	sourceMap.scopes = encodeScopes(scopes, sourceCount, names);
};

/**
 * The module graphs whose code generation should record what each imported
 * binding reads, which is only worth its memory when a map will carry it.
 * @type {WeakSet<ModuleGraph>}
 */
const collectingModuleGraphs = new WeakSet();

/**
 * Asks code generation to record the expression behind each imported binding.
 * @param {ModuleGraph} moduleGraph module graph
 * @returns {void}
 */
const enableImportBindingScopes = (moduleGraph) => {
	collectingModuleGraphs.add(moduleGraph);
};

/**
 * @param {ModuleGraph} moduleGraph module graph
 * @returns {boolean} true when binding expressions are being recorded
 */
const isImportBindingScopesEnabled = (moduleGraph) =>
	collectingModuleGraphs.has(moduleGraph);

module.exports.addScopesToSourceMap = addScopesToSourceMap;
module.exports.collectSourceScopes = collectSourceScopes;
module.exports.enableImportBindingScopes = enableImportBindingScopes;
module.exports.encodeScopes = encodeScopes;
module.exports.isImportBindingScopesEnabled = isImportBindingScopesEnabled;
