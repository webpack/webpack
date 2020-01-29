/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

/** @typedef {import("estree").Node} AnyNode */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {Map<TopLevelSymbol | Dependency, Set<string | TopLevelSymbol> | true>} InnerGraph */
/** @typedef {false|{innerGraph: InnerGraph, allExportDependentDependencies: Set<Dependency>, currentTopLevelSymbol: TopLevelSymbol|void}} State */

/** @type {WeakMap<ParserState, State>} */
const parserStateMap = new WeakMap();
const topLevelSymbolTag = Symbol("top level symbol");

/**
 * @param {ParserState} parserState parser state
 * @returns {State} state
 */
function getState(parserState) {
	return parserStateMap.get(parserState);
}

/**
 * @param {ParserState} parserState parser state
 * @returns {void}
 */
exports.bailout = parserState => {
	parserStateMap.set(parserState, false);
};

/**
 * @param {ParserState} parserState parser state
 * @returns {void}
 */
exports.enable = parserState => {
	const state = parserStateMap.get(parserState);
	if (state === false) {
		return;
	}
	parserStateMap.set(parserState, {
		innerGraph: new Map(),
		allExportDependentDependencies: new Set(),
		currentTopLevelSymbol: undefined
	});
};

/**
 * @param {ParserState} parserState parser state
 * @returns {boolean} true, when enabled
 */
exports.isEnabled = parserState => {
	const state = parserStateMap.get(parserState);
	return !!state;
};

/**
 * @param {ParserState} state parser state
 * @param {TopLevelSymbol | Dependency} symbol the symbol
 * @param {string | TopLevelSymbol | true} usage usage data
 * @returns {void}
 */
exports.addUsage = (state, symbol, usage) => {
	const innerGraphState = getState(state);

	if (innerGraphState) {
		const { innerGraph } = innerGraphState;
		const info = innerGraph.get(symbol);
		if (usage === true) {
			innerGraph.set(symbol, true);
		} else if (info === undefined) {
			innerGraph.set(symbol, new Set([usage]));
		} else if (info !== true) {
			info.add(usage);
		}
	}
};

/**
 * @param {JavascriptParser} parser the parser
 * @param {string} name name of variable
 * @param {string | TopLevelSymbol | true} usage usage data
 * @returns {void}
 */
exports.addVariableUsage = (parser, name, usage) => {
	const symbol = /** @type {TopLevelSymbol} */ (parser.getTagData(
		name,
		topLevelSymbolTag
	));
	if (symbol) {
		exports.addUsage(parser.state, symbol, usage);
	}
};

/**
 * @param {ParserState} state parser state
 * @returns {Map<Dependency, Set<string> | true>} usage data
 */
exports.inferDependencyUsage = state => {
	const innerGraphState = getState(state);

	if (!innerGraphState) {
		return;
	}

	const { allExportDependentDependencies, innerGraph } = innerGraphState;
	// flatten graph to terminal nodes (string, undefined or true)
	const nonTerminal = new Set(innerGraph.keys());
	while (nonTerminal.size > 0) {
		for (const key of nonTerminal) {
			/** @type {Set<string|TopLevelSymbol> | true} */
			let newSet = new Set();
			let isTerminal = true;
			const value = innerGraph.get(key);
			if (value !== true && value !== undefined) {
				for (const item of value) {
					if (typeof item === "string") {
						newSet.add(item);
					} else {
						const itemValue = innerGraph.get(item);
						if (itemValue === true) {
							newSet = true;
							break;
						}
						if (itemValue !== undefined) {
							for (const i of itemValue) {
								if (i === key) continue;
								if (value.has(i)) continue;
								newSet.add(i);
								if (typeof i !== "string") {
									isTerminal = false;
								}
							}
						}
					}
				}
				if (newSet === true) {
					innerGraph.set(key, true);
				} else if (newSet.size === 0) {
					innerGraph.set(key, undefined);
				} else {
					innerGraph.set(key, newSet);
				}
			}
			if (isTerminal) {
				nonTerminal.delete(key);
			}
		}
	}

	/** @type {Map<Dependency, true | Set<string>>} */
	const result = new Map();
	for (const dep of allExportDependentDependencies) {
		const value = /** @type {true | Set<string>} */ (innerGraph.get(dep));
		result.set(dep, value);
	}
	return result;
};

/**
 * @param {ParserState} state parser state
 * @param {Dependency} dep dependency
 */
exports.addDependency = (state, dep) => {
	const innerGraphState = getState(state);

	if (innerGraphState) {
		innerGraphState.allExportDependentDependencies.add(dep);
	}
};

/**
 * @param {ParserState} state parser state
 * @param {TopLevelSymbol} symbol the symbol
 */
exports.setTopLevelSymbol = (state, symbol) => {
	const innerGraphState = getState(state);

	if (innerGraphState) {
		innerGraphState.currentTopLevelSymbol = symbol;
	}
};

/**
 * @param {ParserState} state parser state
 * @returns {TopLevelSymbol|void} usage data
 */
exports.getTopLevelSymbol = state => {
	const innerGraphState = getState(state);

	if (innerGraphState) {
		return innerGraphState.currentTopLevelSymbol;
	}
};

/**
 * @param {JavascriptParser} parser parser
 * @param {string} name name of variable
 * @returns {TopLevelSymbol} symbol
 */
exports.tagTopLevelSymbol = (parser, name) => {
	const innerGraphState = getState(parser.state);
	if (!innerGraphState) return;

	parser.defineVariable(name);

	const existingTag = /** @type {TopLevelSymbol} */ (parser.getTagData(
		name,
		topLevelSymbolTag
	));
	if (existingTag) {
		return existingTag;
	}

	const fn = new TopLevelSymbol(name);
	parser.tagVariable(name, topLevelSymbolTag, fn);
	return fn;
};

class TopLevelSymbol {
	/**
	 * @param {string} name name of the variable
	 */
	constructor(name) {
		this.name = name;
	}
}

exports.TopLevelSymbol = TopLevelSymbol;
exports.topLevelSymbolTag = topLevelSymbolTag;
