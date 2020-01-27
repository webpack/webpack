/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

/** @typedef {import("estree").Node} AnyNode */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../dependencies/HarmonyImportSpecifierDependency")} HarmonyImportSpecifierDependency */
/** @typedef {import("../dependencies/PureExpressionDependency")} PureExpressionDependency */
/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {Map<TopLevelSymbol | Dependency, Set<string | TopLevelSymbol> | true>} InnerGraph */
/** @typedef {false|{innerGraph: InnerGraph, allExportDependentDependencies: Set<PureExpressionDependency|HarmonyImportSpecifierDependency>, currentTopLevelSymbol: TopLevelSymbol|void}} State */

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
 * @param {Set<string | TopLevelSymbol> | true} usage usage data
 */
exports.setUsage = (state, symbol, usage) => {
	const innerGraphState = getState(state);

	if (innerGraphState) {
		innerGraphState.innerGraph.set(symbol, usage);
	}
};

/**
 * @param {ParserState} state parser state
 * @param {TopLevelSymbol | Dependency} symbol the symbol
 * @returns {Set<string | TopLevelSymbol> | true} usage data
 */
exports.getUsage = (state, symbol) => {
	const innerGraphState = getState(state);

	if (innerGraphState) {
		return innerGraphState.innerGraph.get(symbol);
	}
};

/**
 * @param {ParserState} state parser state
 * @returns {Map<Dependency, Set<string | TopLevelSymbol> | true>} usage data
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

	for (const dep of allExportDependentDependencies) {
		const value = innerGraph.get(dep);
		switch (value) {
			case undefined:
				dep.usedByExports = false;
				break;
			case true:
				dep.usedByExports = true;
				break;
			default:
				dep.usedByExports = /** @type {Set<string>} */ (value);
				break;
		}
	}
};

/**
 * @param {ParserState} state parser state
 * @param {PureExpressionDependency|HarmonyImportSpecifierDependency} dep dependency
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
 * @param {ParserState} state parser state
 * @returns {Set<PureExpressionDependency|HarmonyImportSpecifierDependency>} dependencies
 */
exports.getExportDependentDependencies = state => {
	const innerGraphState = getState(state);

	if (innerGraphState) {
		return innerGraphState.allExportDependentDependencies;
	}
};

/**
 * @param {ParserState} state parser state
 * @param {string} name symbol name
 * @returns {TopLevelSymbol} usage data
 */
exports.createTopLevelSymbol = (state, name) => {
	const innerGraphState = getState(state);
	const { innerGraph } = innerGraphState || {};

	return new TopLevelSymbol(name, innerGraph);
};

class TopLevelSymbol {
	/**
	 * @param {string} name name of the function
	 * @param {InnerGraph} innerGraph reference to the graph
	 */
	constructor(name, innerGraph) {
		this.name = name;
		this.innerGraph = innerGraph;
	}

	/**
	 * @param {string | TopLevelSymbol | true} dep export or top level symbol or always
	 * @returns {void}
	 */
	addDependency(dep) {
		const info = this.innerGraph.get(this);
		if (dep === true) {
			this.innerGraph.set(this, true);
		} else if (info === undefined) {
			this.innerGraph.set(this, new Set([dep]));
		} else if (info !== true) {
			info.add(dep);
		}
	}
}

exports.TopLevelSymbol = TopLevelSymbol;
exports.topLevelSymbolTag = topLevelSymbolTag;
