/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

/** @typedef {import("estree").Node} AnyNode */
/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */

/** @typedef {Map<TopLevelSymbol, Set<string | TopLevelSymbol> | true>} InnerGraph */
/** @typedef {function(boolean | Set<string> | undefined): void} UsageCallback */

/**
 * @typedef {Object} StateObject
 * @property {InnerGraph} innerGraph
 * @property {TopLevelSymbol=} currentTopLevelSymbol
 * @property {Map<TopLevelSymbol, Set<UsageCallback>>} usageCallbackMap
 */

/** @typedef {false|StateObject} State */

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
		currentTopLevelSymbol: undefined,
		usageCallbackMap: new Map()
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
 * @param {TopLevelSymbol} symbol the symbol
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
 * @returns {void}
 */
exports.inferDependencyUsage = state => {
	const innerGraphState = getState(state);

	if (!innerGraphState) {
		return;
	}

	const { innerGraph, usageCallbackMap } = innerGraphState;
	const processed = new Map();
	// flatten graph to terminal nodes (string, undefined or true)
	const nonTerminal = new Set(innerGraph.keys());
	while (nonTerminal.size > 0) {
		for (const key of nonTerminal) {
			/** @type {Set<string|TopLevelSymbol> | true} */
			let newSet = new Set();
			let isTerminal = true;
			const value = innerGraph.get(key);
			let alreadyProcessed = processed.get(key);
			if (alreadyProcessed === undefined) {
				alreadyProcessed = new Set();
				processed.set(key, alreadyProcessed);
			}
			if (value !== true && value !== undefined) {
				for (const item of value) {
					alreadyProcessed.add(item);
				}
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
								if (alreadyProcessed.has(i)) continue;
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
	for (const [symbol, callbacks] of usageCallbackMap) {
		const usage = /** @type {true | Set<string> | undefined} */ (innerGraph.get(
			symbol
		));
		for (const callback of callbacks) {
			callback(usage === undefined ? false : usage);
		}
	}
};

/**
 * @param {ParserState} state parser state
 * @param {UsageCallback} onUsageCallback on usage callback
 */
exports.onUsage = (state, onUsageCallback) => {
	const innerGraphState = getState(state);

	if (innerGraphState) {
		const { usageCallbackMap, currentTopLevelSymbol } = innerGraphState;
		if (currentTopLevelSymbol) {
			let callbacks = usageCallbackMap.get(currentTopLevelSymbol);

			if (callbacks === undefined) {
				callbacks = new Set();
				usageCallbackMap.set(currentTopLevelSymbol, callbacks);
			}

			callbacks.add(onUsageCallback);
		} else {
			onUsageCallback(true);
		}
	} else {
		onUsageCallback(undefined);
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
