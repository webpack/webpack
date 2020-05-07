/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { HookMap, SyncWaterfallHook, SyncBailHook } = require("tapable");

/**
 * @typedef {Object} PrintedElement
 * @property {string} element
 * @property {string} content
 */

class StatsPrinter {
	constructor() {
		this.hooks = Object.freeze({
			/** @type {HookMap<SyncBailHook<[string[], Object]>>} */
			sortElements: new HookMap(
				() => new SyncBailHook(["elements", "context"])
			),
			/** @type {HookMap<SyncBailHook<[PrintedElement[], Object]>>} */
			printElements: new HookMap(
				() => new SyncBailHook(["printedElements", "context"])
			),
			/** @type {HookMap<SyncBailHook<[any[], Object]>>} */
			sortItems: new HookMap(() => new SyncBailHook(["items", "context"])),
			/** @type {HookMap<SyncBailHook<[any, Object]>>} */
			getItemName: new HookMap(() => new SyncBailHook(["item", "context"])),
			/** @type {HookMap<SyncBailHook<[string[], Object]>>} */
			printItems: new HookMap(
				() => new SyncBailHook(["printedItems", "context"])
			),
			/** @type {HookMap<SyncBailHook<[Object, Object]>>} */
			print: new HookMap(() => new SyncBailHook(["object", "context"])),
			/** @type {HookMap<SyncWaterfallHook<[string, Object]>>} */
			result: new HookMap(() => new SyncWaterfallHook(["result", "context"]))
		});
		/** @type {Map<HookMap<SyncBailHook<[any[], Object]>>, Map<string, SyncBailHook<[any[], Object]>[]>>} */
		this._levelHookCache = new Map();
		this._inPrint = false;
	}

	/**
	 * get all level hooks
	 * @param {HookMap<any, any>} hookMap HookMap
	 * @param {string} type type
	 * @returns {SyncBailHook<[any[], any], any>[]} hook
	 */
	_getAllLevelHooks(hookMap, type) {
		let cache = this._levelHookCache.get(hookMap);
		if (cache === undefined) {
			cache = new Map();
			this._levelHookCache.set(hookMap, cache);
		}
		const cacheEntry = cache.get(type);
		if (cacheEntry !== undefined) {
			return cacheEntry;
		}
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
	 * @template T
	 * @param {HookMap<any, any>} hookMap HookMap
	 * @param {string} type type
	 * @param {(hook: SyncBailHook<[any[], any], any>) => T} fn function
	 * @returns {T} result of `fn`
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
	 * @template U
	 * @param {HookMap<any, any>} hookMap HookMap
	 * @param {string} type type
	 * @param {Object} data data
	 * @param {(hook: SyncBailHook<[any[], any], any>, data: U) => T} fn function
	 * @returns {T} result of `fn`
	 */
	_forEachLevelWaterfall(hookMap, type, data, fn) {
		for (const hook of this._getAllLevelHooks(hookMap, type)) {
			data = fn(hook, data);
		}
		return data;
	}

	/**
	 * print
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
	 * print
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
				const elements = Object.keys(object);
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
