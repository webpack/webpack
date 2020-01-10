/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { HookMap, SyncHook } = require("tapable");

/** @typedef {import("estree").Node} AnyNode */
/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {Map<GraphNode, boolean|Set<GraphNode>>} InnerGraph */
/** @typedef {false|{graph: InnerGraph, nodeCache: WeakMap<AnyNode, GraphNode>, topLevelNode: GraphNode|void}} State */

/** @type {WeakMap<ParserState, State>} */
const parserStateMap = new WeakMap();

exports.hooks = {
	usedByExports: new HookMap(() => new SyncHook(["value"]))
};

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
		graph: new Map(),
		nodeCache: new WeakMap(),
		topLevelNode: undefined
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

/**
 * @param {ParserState} parserState parser state
 * @param {AnyNode} expr as node
 * @returns {GraphNode|void} graph node
 */
exports.getNodeForExpr = (parserState, expr) => {
	const state = parserStateMap.get(parserState);
	if (!state) {
		return;
	}

	return state.nodeCache.get(expr);
};

/**
 * @param {ParserState} parserState parser state
 * @param {AnyNode} expr as node
 * @param {string} [name=undefined] name of the function
 * @param {boolean} [isExport=false] is export node
 * @returns {GraphNode|void} graph node
 */
exports.getNode = (parserState, expr, name, isExport = false) => {
	const state = parserStateMap.get(parserState);
	if (!state) {
		return;
	}

	let node = state.nodeCache.get(expr);

	if (!node) {
		if (name === undefined) {
			return;
		}
		node = new GraphNode(expr, name, isExport, state.graph);
		state.nodeCache.set(expr, node);
		state.graph.set(node, false);
	}

	return node;
};

/**
 * @param {ParserState} parserState parser state
 * @param {GraphNode|void} graphNode graph node
 */
exports.setTopLevelNode = (parserState, graphNode) => {
	const state = parserStateMap.get(parserState);
	if (!state) {
		return;
	}

	state.topLevelNode = graphNode;
};

/**
 * @param {ParserState} parserState parser state
 * @returns {GraphNode|void} graph node
 */
exports.getTopLevelNode = parserState => {
	const state = parserStateMap.get(parserState);
	if (!state) {
		return;
	}

	return state.topLevelNode;
};

class GraphNode {
	/**
	 * @param {AnyNode} astNode ast node
	 * @param {string} name name of the function
	 * @param {boolean} isExport is export node
	 * @param {InnerGraph} graph reference to the graph
	 */
	constructor(astNode, name, isExport, graph) {
		this.astNode = astNode;
		this.name = name;
		this.isExport = isExport;
		this.graph = graph;
		this.usedByExports = new Set();
	}

	/**
	 * @param {GraphNode|boolean} usedBy link to
	 * @returns {void}
	 */
	addLink(usedBy) {
		let links = this.graph.get(this);

		if (links === true) {
			return;
		}

		if (usedBy instanceof GraphNode) {
			if (!links) {
				links = new Set();
				this.graph.set(this, links);
			}

			links.add(usedBy);

			if (usedBy.isExport) {
				this.usedByExports.add(usedBy.name);
			}

			if (usedBy.usedByExports.size) {
				for (const exportName of usedBy.usedByExports) {
					this.usedByExports.add(exportName);
				}
			}
		} else {
			this.graph.set(this, usedBy);
		}
	}
}

exports.GraphNode = GraphNode;
