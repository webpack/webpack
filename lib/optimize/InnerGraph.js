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

exports.parserStateMap = parserStateMap;

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
 * @param {ParserState} parserState parser state
 * @returns {State} state
 */
exports.getState = parserState => {
	return parserStateMap.get(parserState);
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
