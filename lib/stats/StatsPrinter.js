/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { HookMap, SyncWaterfallHook, SyncBailHook } = require("tapable");

/** @template T @typedef {import("tapable").AsArray<T>} AsArray<T> */
/** @typedef {import("tapable").Hook} Hook */
/** @typedef {import("./DefaultStatsFactoryPlugin").StatsAsset} StatsAsset */
/** @typedef {import("./DefaultStatsFactoryPlugin").StatsChunk} StatsChunk */
/** @typedef {import("./DefaultStatsFactoryPlugin").StatsChunkGroup} StatsChunkGroup */
/** @typedef {import("./DefaultStatsFactoryPlugin").StatsCompilation} StatsCompilation */
/** @typedef {import("./DefaultStatsFactoryPlugin").StatsModule} StatsModule */
/** @typedef {import("./DefaultStatsFactoryPlugin").StatsModuleReason} StatsModuleReason */

/**
 * @typedef {Object} PrintedElement
 * @property {string} element
 * @property {string} content
 */

/**
 * @typedef {Object} KnownStatsPrinterContext
 * @property {string=} type
 * @property {StatsCompilation=} compilation
 * @property {StatsChunkGroup=} chunkGroup
 * @property {StatsAsset=} asset
 * @property {StatsModule=} module
 * @property {StatsChunk=} chunk
 * @property {StatsModuleReason=} moduleReason
 * @property {(str: string) => string=} bold
 * @property {(str: string) => string=} yellow
 * @property {(str: string) => string=} red
 * @property {(str: string) => string=} green
 * @property {(str: string) => string=} magenta
 * @property {(str: string) => string=} cyan
 * @property {(file: string, oversize?: boolean) => string=} formatFilename
 * @property {(id: string) => string=} formatModuleId
 * @property {(id: string, direction?: "parent"|"child"|"sibling") => string=} formatChunkId
 * @property {(size: number) => string=} formatSize
 * @property {(dateTime: number) => string=} formatDateTime
 * @property {(flag: string) => string=} formatFlag
 * @property {(time: number, boldQuantity?: boolean) => string=} formatTime
 * @property {string=} chunkGroupKind
 */

/** @typedef {KnownStatsPrinterContext & Record<string, any>} StatsPrinterContext */

class StatsPrinter {
	constructor() {
		this.hooks = Object.freeze({
			/** @type {HookMap<SyncBailHook<[string[], StatsPrinterContext], true>>} */
			sortElements: new HookMap(
				() => new SyncBailHook(["elements", "context"])
			),
			/** @type {HookMap<SyncBailHook<[PrintedElement[], StatsPrinterContext], string>>} */
			printElements: new HookMap(
				() => new SyncBailHook(["printedElements", "context"])
			),
			/** @type {HookMap<SyncBailHook<[any[], StatsPrinterContext], true>>} */
			sortItems: new HookMap(() => new SyncBailHook(["items", "context"])),
			/** @type {HookMap<SyncBailHook<[any, StatsPrinterContext], string>>} */
			getItemName: new HookMap(() => new SyncBailHook(["item", "context"])),
			/** @type {HookMap<SyncBailHook<[string[], StatsPrinterContext], string>>} */
			printItems: new HookMap(
				() => new SyncBailHook(["printedItems", "context"])
			),
			/** @type {HookMap<SyncBailHook<[{}, StatsPrinterContext], string>>} */
			print: new HookMap(() => new SyncBailHook(["object", "context"])),
			/** @type {HookMap<SyncWaterfallHook<[string, StatsPrinterContext]>>} */
			result: new HookMap(() => new SyncWaterfallHook(["result", "context"]))
		});
		/** @type {Map<HookMap<Hook>, Map<string, Hook[]>>} */
		this._levelHookCache = new Map();
		this._inPrint = false;
	}

	/**
	 * get all level hooks
	 * @private
	 * @template {Hook} T
	 * @param {HookMap<T>} hookMap HookMap
	 * @param {string} type type
	 * @returns {T[]} hooks
	 */
	_getAllLevelHooks(hookMap, type) {
		let cache = /** @type {Map<string, T[]>} */ (this._levelHookCache.get(
			hookMap
		));
		if (cache === undefined) {
			cache = new Map();
			this._levelHookCache.set(hookMap, cache);
		}
		const cacheEntry = cache.get(type);
		if (cacheEntry !== undefined) {
			return cacheEntry;
		}
		/** @type {T[]} */
		const hooks = [];
		const typeParts = type.split(".");
		for (let i = 0; i < typeParts.length; i++) {
			const hook = hookMap.get(typeParts.slice(i).join("."));
			if (hook) {
				hooks.push(hook);
			}
		}
		cache.set(type, hooks);
		return hooks;
	}

	/**
	 * Run `fn` for each level
	 * @private
	 * @template T
	 * @template R
	 * @param {HookMap<SyncBailHook<T, R>>} hookMap HookMap
	 * @param {string} type type
	 * @param {(hook: SyncBailHook<T, R>) => R} fn function
	 * @returns {R} result of `fn`
	 */
	_forEachLevel(hookMap, type, fn) {
		for (const hook of this._getAllLevelHooks(hookMap, type)) {
			const result = fn(hook);
			if (result !== undefined) return result;
		}
	}

	/**
	 * Run `fn` for each level
	 * @private
	 * @template T
	 * @param {HookMap<SyncWaterfallHook<T>>} hookMap HookMap
	 * @param {string} type type
	 * @param {AsArray<T>[0]} data data
	 * @param {(hook: SyncWaterfallHook<T>, data: AsArray<T>[0]) => AsArray<T>[0]} fn function
	 * @returns {AsArray<T>[0]} result of `fn`
	 */
	_forEachLevelWaterfall(hookMap, type, data, fn) {
		for (const hook of this._getAllLevelHooks(hookMap, type)) {
			data = fn(hook, data);
		}
		return data;
	}

	/**
	 * @param {string} type The type
	 * @param {Object} object Object to print
	 * @param {Object=} baseContext The base context
	 * @returns {string} printed result
	 */
	print(type, object, baseContext) {
		if (this._inPrint) {
			return this._print(type, object, baseContext);
		} else {
			try {
				this._inPrint = true;
				return this._print(type, object, baseContext);
			} finally {
				this._levelHookCache.clear();
				this._inPrint = false;
			}
		}
	}

	/**
	 * @private
	 * @param {string} type type
	 * @param {Object} object object
	 * @param {Object=} baseContext context
	 * @returns {string} printed result
	 */
	_print(type, object, baseContext) {
		const context = {
			...baseContext,
			type,
			[type]: object
		};

		let printResult = this._forEachLevel(this.hooks.print, type, hook =>
			hook.call(object, context)
		);
		if (printResult === undefined) {
			if (Array.isArray(object)) {
				const sortedItems = object.slice();
				this._forEachLevel(this.hooks.sortItems, type, h =>
					h.call(sortedItems, context)
				);
				const printedItems = sortedItems.map((item, i) => {
					const itemContext = {
						...context,
						_index: i
					};
					const itemName = this._forEachLevel(
						this.hooks.getItemName,
						`${type}[]`,
						h => h.call(item, itemContext)
					);
					if (itemName) itemContext[itemName] = item;
					return this.print(
						itemName ? `${type}[].${itemName}` : `${type}[]`,
						item,
						itemContext
					);
				});
				printResult = this._forEachLevel(this.hooks.printItems, type, h =>
					h.call(printedItems, context)
				);
				if (printResult === undefined) {
					const result = printedItems.filter(Boolean);
					if (result.length > 0) printResult = result.join("\n");
				}
			} else if (object !== null && typeof object === "object") {
				const elements = Object.keys(object).filter(
					key => object[key] !== undefined
				);
				this._forEachLevel(this.hooks.sortElements, type, h =>
					h.call(elements, context)
				);
				const printedElements = elements.map(element => {
					const content = this.print(`${type}.${element}`, object[element], {
						...context,
						_parent: object,
						_element: element,
						[element]: object[element]
					});
					return { element, content };
				});
				printResult = this._forEachLevel(this.hooks.printElements, type, h =>
					h.call(printedElements, context)
				);
				if (printResult === undefined) {
					const result = printedElements.map(e => e.content).filter(Boolean);
					if (result.length > 0) printResult = result.join("\n");
				}
			}
		}

		return this._forEachLevelWaterfall(
			this.hooks.result,
			type,
			printResult,
			(h, r) => h.call(r, context)
		);
	}
}
module.exports = StatsPrinter;
