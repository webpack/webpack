/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const { UsageState } = require("../ExportsInfo");
const JavascriptParser = require("../javascript/JavascriptParser");

/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").GetConditionFn} GetConditionFn */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

/** @typedef {boolean | ((compilation: Compilation) => boolean)} PureCondition */
/** @typedef {Set<string | TopLevelSymbol>} InnerGraphValueSet */
/** @typedef {InnerGraphValueSet | true} InnerGraphValue */
/** @typedef {TopLevelSymbol | null} InnerGraphKey */
/** @typedef {Map<InnerGraphKey, InnerGraphValue | undefined>} InnerGraph */
/** @typedef {(value: boolean | Set<string> | undefined, module: Module) => void} UsageCallback */

/**
 * Defines the state object type used by this module.
 * @typedef {object} StateObject
 * @property {InnerGraph} innerGraph
 * @property {TopLevelSymbol=} currentTopLevelSymbol
 * @property {Map<TopLevelSymbol, Set<UsageCallback>>} usageCallbackMap
 */

/** @typedef {false | StateObject} State */
/** @typedef {string | TopLevelSymbol | true} Usage */
/** @typedef {Set<string> | boolean} UsedByExports */
/** @typedef {Dependency & { usedByExports: UsedByExports | undefined }} DependencyWithUsedByExports */

class TopLevelSymbol {
	/**
	 * Creates an instance of TopLevelSymbol.
	 * @param {string} name name of the variable
	 * @param {PureCondition=} pure pure condition
	 */
	constructor(name, pure = false) {
		/** @type {string} */
		this.name = name;
		/** @type {(compilation: Compilation) => boolean} */
		this.pure = () => false;
		this.setPure(pure);
	}

	/**
	 * Sets the pure condition
	 * @param {PureCondition} pure pure condition
	 * @returns {void}
	 */
	setPure(pure) {
		this.pure = typeof pure === "function" ? pure : () => pure;
	}

	/**
	 * @param {Compilation} compilation compilation
	 * @returns {boolean} if the symbol is pure
	 */
	isPure(compilation) {
		return this.pure(compilation);
	}
}

module.exports.TopLevelSymbol = TopLevelSymbol;

const topLevelSymbolTag = Symbol("top level symbol");

/** @type {WeakMap<Compilation, InnerGraphUtils>} */
const innerGraphByCompilation = new WeakMap();

/**
 * @typedef {object} InnerGraphUtils
 * @property {(parserState: ParserState) => void} enable
 * @property {(parserState: ParserState) => void} bailout
 * @property {(parserState: ParserState) => boolean} isEnabled
 * @property {(parserState: ParserState, symbol: TopLevelSymbol | null, usage: Usage) => void} addUsage
 * @property {(parserState: ParserState, onUsageCallback: UsageCallback) => void} onUsage
 * @property {(parserState: ParserState, symbol: TopLevelSymbol | undefined) => void} setTopLevelSymbol
 * @property {(parserState: ParserState) => TopLevelSymbol | void} getTopLevelSymbol
 * @property {(parser: JavascriptParser, name: string, pure?: PureCondition) => TopLevelSymbol | undefined} tagTopLevelSymbol
 * @property {(parser: JavascriptParser, name: string, usage: Usage) => void} addVariableUsage
 * @property {(module: Module) => void} inferDependencyUsage
 */

/**
 * Returns false, when unused. Otherwise true.
 * @param {Dependency} dependency the dependency
 * @param {UsedByExports | undefined} usedByExports usedByExports info
 * @param {ModuleGraph} moduleGraph moduleGraph
 * @param {RuntimeSpec} runtime runtime
 * @returns {boolean} false, when unused. Otherwise true
 */
function isDependencyUsedByExports(
	dependency,
	usedByExports,
	moduleGraph,
	runtime
) {
	if (usedByExports === false) return false;
	if (usedByExports !== true && usedByExports !== undefined) {
		const selfModule =
			/** @type {Module} */
			(moduleGraph.getParentModule(dependency));
		const exportsInfo = moduleGraph.getExportsInfo(selfModule);
		for (const exportName of usedByExports) {
			if (exportsInfo.getUsed(exportName, runtime) !== UsageState.Unused) {
				return true;
			}
		}
		return false;
	}
	return true;
}

/**
 * Returns dependency condition
 * @param {Dependency} dependency the dependency
 * @param {ModuleGraph} moduleGraph moduleGraph
 * @returns {null | false | GetConditionFn} function to determine if the connection is active
 */
module.exports.getDependencyUsedByExportsCondition = (
	dependency,
	moduleGraph
) => {
	switch (
		/** @type {DependencyWithUsedByExports} */ (dependency).usedByExports
	) {
		case false:
			return false;
		case true:
			return null;
		default:
			return (_connections, runtime) =>
				isDependencyUsedByExports(
					dependency,
					/** @type {DependencyWithUsedByExports} */ (dependency).usedByExports,
					moduleGraph,
					runtime
				);
	}
};

/**
 * Returns the InnerGraph utils scoped to a single compilation.
 * @param {Compilation} compilation the compilation
 * @returns {InnerGraphUtils} utils
 */
module.exports.getInnerGraph = (compilation) => {
	let utils = innerGraphByCompilation.get(compilation);
	if (utils) return utils;

	/** @type {WeakMap<Module, State>} */
	const graphByModule = new WeakMap();

	/**
	 * @param {ParserState} parserState parser state
	 * @returns {State | undefined} state
	 */
	function getState(parserState) {
		return graphByModule.get(parserState.module);
	}

	/**
	 * @param {ParserState} parserState parser state
	 * @returns {void}
	 */
	function enable(parserState) {
		const state = graphByModule.get(parserState.module);
		if (state === false) {
			return;
		}
		graphByModule.set(parserState.module, {
			innerGraph: new Map(),
			currentTopLevelSymbol: undefined,
			usageCallbackMap: new Map()
		});
	}

	/**
	 * @param {ParserState} parserState parser state
	 * @returns {void}
	 */
	function bailout(parserState) {
		graphByModule.set(parserState.module, false);
	}

	/**
	 * @param {ParserState} parserState parser state
	 * @returns {boolean} true, when enabled
	 */
	function isEnabled(parserState) {
		return Boolean(graphByModule.get(parserState.module));
	}

	/**
	 * @param {ParserState} state parser state
	 * @param {TopLevelSymbol | null} symbol the symbol, or null for all symbols
	 * @param {Usage} usage usage data
	 * @returns {void}
	 */
	function addUsage(state, symbol, usage) {
		const innerGraphState = getState(state);

		if (innerGraphState) {
			let actualUsage = usage;
			if (
				actualUsage !== true &&
				typeof actualUsage !== "string" &&
				!actualUsage.isPure(compilation)
			) {
				actualUsage = true;
			}

			const { innerGraph } = innerGraphState;
			const info = innerGraph.get(symbol);
			if (actualUsage === true) {
				innerGraph.set(symbol, true);
			} else if (info === undefined) {
				innerGraph.set(symbol, new Set([actualUsage]));
			} else if (info !== true) {
				info.add(actualUsage);
			}
		}
	}

	/**
	 * @param {JavascriptParser} parser the parser
	 * @param {string} name name of variable
	 * @param {Usage} usage usage data
	 * @returns {void}
	 */
	function addVariableUsage(parser, name, usage) {
		const symbol =
			/** @type {TopLevelSymbol} */ (
				parser.getTagData(name, topLevelSymbolTag)
			) || tagTopLevelSymbol(parser, name);
		if (symbol) {
			addUsage(parser.state, symbol, usage);
		}
	}

	/**
	 * @param {ParserState} state parser state
	 * @returns {TopLevelSymbol | void} usage data
	 */
	function getTopLevelSymbol(state) {
		const innerGraphState = getState(state);

		if (innerGraphState) {
			return innerGraphState.currentTopLevelSymbol;
		}
	}

	/**
	 * @param {ParserState} state parser state
	 * @param {TopLevelSymbol | undefined} symbol the symbol
	 */
	function setTopLevelSymbol(state, symbol) {
		const innerGraphState = getState(state);

		if (innerGraphState) {
			innerGraphState.currentTopLevelSymbol = symbol;
		}
	}

	/**
	 * @param {ParserState} state parser state
	 * @param {UsageCallback} onUsageCallback on usage callback
	 */
	function onUsage(state, onUsageCallback) {
		const innerGraphState = getState(state);

		if (innerGraphState) {
			const { usageCallbackMap, currentTopLevelSymbol } = innerGraphState;
			if (currentTopLevelSymbol) {
				if (!currentTopLevelSymbol.isPure(compilation)) {
					onUsageCallback(true, state.module);
					return;
				}

				let callbacks = usageCallbackMap.get(currentTopLevelSymbol);

				if (callbacks === undefined) {
					/** @type {Set<UsageCallback>} */
					callbacks = new Set();
					usageCallbackMap.set(currentTopLevelSymbol, callbacks);
				}

				callbacks.add(onUsageCallback);
			} else {
				onUsageCallback(true, state.module);
			}
		} else {
			onUsageCallback(undefined, state.module);
		}
	}

	/**
	 * @param {JavascriptParser} parser parser
	 * @param {string} name name of variable
	 * @param {PureCondition=} pure pure condition
	 * @returns {TopLevelSymbol | undefined} symbol
	 */
	function tagTopLevelSymbol(parser, name, pure) {
		const innerGraphState = getState(parser.state);
		if (!innerGraphState) return;

		parser.defineVariable(name);

		const existingTag = /** @type {TopLevelSymbol} */ (
			parser.getTagData(name, topLevelSymbolTag)
		);
		if (existingTag) {
			if (pure !== undefined) {
				existingTag.setPure(pure);
			}
			return existingTag;
		}

		const symbol = new TopLevelSymbol(name, pure);
		parser.tagVariable(
			name,
			topLevelSymbolTag,
			symbol,
			JavascriptParser.VariableInfoFlags.Normal
		);
		return symbol;
	}

	/**
	 * @param {Module} module module
	 * @returns {void}
	 */
	function inferDependencyUsage(module) {
		const innerGraphState = graphByModule.get(module);

		if (!innerGraphState) {
			return;
		}

		const { innerGraph, usageCallbackMap } = innerGraphState;
		/** @type {Map<InnerGraphKey, InnerGraphValueSet | undefined>} */
		const processed = new Map();
		// flatten graph to terminal nodes (string, undefined or true)
		const nonTerminal = new Set(innerGraph.keys());
		while (nonTerminal.size > 0) {
			for (const key of nonTerminal) {
				if (key !== null && !key.isPure(compilation)) {
					innerGraph.set(key, true);
					nonTerminal.delete(key);
					continue;
				}

				/** @type {InnerGraphValue} */
				let newSet = new Set();
				let isTerminal = true;
				const value = innerGraph.get(key);
				let alreadyProcessed = processed.get(key);
				if (alreadyProcessed === undefined) {
					/** @type {InnerGraphValueSet} */
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
						} else if (!item.isPure(compilation)) {
							newSet = true;
							break;
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

					// For the global key, merge with all other keys
					if (key === null) {
						const globalValue = innerGraph.get(null);
						if (globalValue) {
							for (const [key, value] of innerGraph) {
								if (key !== null && value !== true) {
									if (globalValue === true) {
										innerGraph.set(key, true);
									} else {
										const newSet = new Set(value);
										for (const item of globalValue) {
											newSet.add(item);
										}
										innerGraph.set(key, newSet);
									}
								}
							}
						}
					}
				}
			}
		}

		/** @type {Map<Dependency, true | Set<string>>} */
		for (const [symbol, callbacks] of usageCallbackMap) {
			const usage = symbol.isPure(compilation)
				? /** @type {true | Set<string> | undefined} */ (innerGraph.get(symbol))
				: true;
			for (const callback of callbacks) {
				callback(usage === undefined ? false : usage, module);
			}
		}
	}

	utils = {
		enable,
		bailout,
		isEnabled,
		addUsage,
		addVariableUsage,
		getTopLevelSymbol,
		setTopLevelSymbol,
		onUsage,
		tagTopLevelSymbol,
		inferDependencyUsage
	};
	innerGraphByCompilation.set(compilation, utils);
	return utils;
};

/**
 * Usage callback map.
 * @param {Dependency} dependency the dependency
 * @param {UsedByExports | undefined} usedByExports usedByExports info
 * @param {ModuleGraph} moduleGraph moduleGraph
 * @returns {null | false | GetConditionFn} function to determine if the connection is active
 */

module.exports.topLevelSymbolTag = topLevelSymbolTag;
