/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { HookMap, SyncBailHook, SyncWaterfallHook } = require("tapable");

/**
 * @import {
 * 	StatsAsset,
 * 	StatsChunk,
 * 	StatsChunkGroup,
 * 	StatsChunkOrigin,
 * 	StatsCompilation,
 * 	StatsError,
 * 	StatsJsonValue,
 * 	StatsLogging,
 * 	StatsLoggingEntry,
 * 	StatsModule,
 * 	StatsModuleIssuer,
 * 	StatsModuleReason,
 * 	StatsModuleTraceDependency,
 * 	StatsModuleTraceItem,
 * 	StatsProfile
 * } from "./DefaultStatsFactoryPlugin"
 */
/** @import { StatsPluginValue } from "./StatsFactory" */

/**
 * Defines the printed element type used by this module.
 * @typedef {object} PrintedElement
 * @property {string} element
 * @property {string | undefined} content
 */

/**
 * Defines the known stats printer context type used by this module.
 * A plugin types its own fields by declaration merging: `declare module "webpack" { interface KnownStatsPrinterContext { myField?: MyType } }`.
 * @augmentable
 * @typedef {object} KnownStatsPrinterContext
 * @property {string=} type
 * @property {StatsCompilation=} compilation
 * @property {StatsChunkGroup=} chunkGroup
 * @property {string=} chunkGroupKind
 * @property {StatsAsset=} asset
 * @property {StatsModule=} module
 * @property {StatsChunk=} chunk
 * @property {StatsModuleReason=} moduleReason
 * @property {StatsModuleIssuer=} moduleIssuer
 * @property {StatsError=} error
 * @property {StatsProfile=} profile
 * @property {StatsLogging=} logging
 * @property {StatsModuleTraceItem=} moduleTraceItem
 * @property {StatsModuleTraceDependency=} moduleTraceDependency
 * @property {number=} _index the item's position in the list being printed
 * @property {number=} timeReference the compilation's time, which colors other times by their share of it
 */

/** @typedef {(value: string | number) => string} ColorFunction */

/**
 * Defines the known stats printer color functions type used by this module.
 * @typedef {object} KnownStatsPrinterColorFunctions
 * @property {ColorFunction=} bold
 * @property {ColorFunction=} yellow
 * @property {ColorFunction=} red
 * @property {ColorFunction=} green
 * @property {ColorFunction=} magenta
 * @property {ColorFunction=} cyan
 */

/**
 * Defines the known stats printer formatters type used by this module.
 * @typedef {object} KnownStatsPrinterFormatters
 * @property {(file: string, oversize?: boolean) => string=} formatFilename
 * @property {(id: string | number) => string=} formatModuleId
 * @property {(id: string | number, direction?: "parent" | "child" | "sibling") => string=} formatChunkId
 * @property {(size: number) => string=} formatSize
 * @property {(size: string) => string=} formatLayer
 * @property {(dateTime: number) => string=} formatDateTime
 * @property {(flag: string) => string=} formatFlag
 * @property {(time: number, boldQuantity?: boolean) => string=} formatTime
 * @property {(message: string) => string=} formatError
 */

// TODO in the next major release: drop the `Record<string, EXPECTED_ANY>` fallback; fields go in `KnownStatsPrinterContext`
/** @typedef {KnownStatsPrinterColorFunctions & KnownStatsPrinterFormatters & KnownStatsPrinterContext & Record<string, EXPECTED_ANY>} StatsPrinterContext */
/** @typedef {StatsPrinterContext & Required<KnownStatsPrinterColorFunctions> & Required<KnownStatsPrinterFormatters> & { type: string }} StatsPrinterContextWithExtra */
/**
 * The value `print` receives for each object key, which also matches same-named fields.
 * A plugin types its own keys by declaration merging: `declare module "webpack" { interface StatsPrinterPrintKeys { "myPlugin.data": MyObject } }`.
 * @augmentable
 * @typedef {object} StatsPrinterPrintKeys
 * @property {StatsCompilation} compilation
 * @property {StatsAsset} asset
 * @property {StatsChunk} chunk
 * @property {StatsChunkGroup} chunkGroup
 * @property {StatsModule | string | null} module
 * @property {StatsModuleReason} moduleReason
 * @property {StatsModuleIssuer} moduleIssuer
 * @property {StatsChunkOrigin} chunkOrigin
 * @property {StatsError} error
 * @property {StatsProfile} profile
 * @property {StatsLogging & { name: string }} loggingGroup
 * @property {StatsModuleTraceItem} moduleTraceItem
 * @property {StatsModuleTraceDependency} moduleTraceDependency
 */

/**
 * The item of each array path, which `sortItems` receives the array of.
 * A plugin types its own paths by declaration merging: `declare module "webpack" { interface StatsPrinterItemKeys { "myPlugin.items": MyItem } }`.
 * @augmentable
 * @typedef {{
 * "compilation.assets": StatsAsset,
 * "compilation.modules": StatsModule,
 * "compilation.chunks": StatsChunk,
 * "compilation.entrypoints": StatsChunkGroup,
 * "compilation.namedChunkGroups": StatsChunkGroup,
 * "compilation.errors": StatsError,
 * "compilation.warnings": StatsError,
 * "compilation.hints": StatsError,
 * "compilation.logging": StatsLogging & { name: string },
 * "compilation.children": StatsCompilation,
 * "asset.related": StatsAsset,
 * "asset.children": StatsAsset,
 * "module.modules": StatsModule,
 * "module.children": StatsModule,
 * "module.reasons": StatsModuleReason,
 * "moduleReason.children": StatsModuleReason,
 * "module.issuerPath": StatsModuleIssuer,
 * "chunk.origins": StatsChunkOrigin,
 * "chunk.modules": StatsModule,
 * "loggingGroup.entries": StatsLoggingEntry,
 * "loggingEntry.children": StatsLoggingEntry,
 * "error.moduleTrace": StatsModuleTraceItem,
 * "error.errors": StatsError,
 * "moduleTraceItem.dependencies": StatsModuleTraceDependency,
 * }} StatsPrinterItemKeys
 */

/**
 * The item `getItemName` receives for each `<array path>[]` key: that path's `StatsPrinterItemKeys` entry.
 * A plugin types its own keys by declaration merging: `declare module "webpack" { interface StatsPrinterItemNameKeys { "myPlugin.items[]": MyItem } }`.
 * @augmentable
 * @typedef {{
 * "compilation.assets[]": StatsAsset,
 * "compilation.modules[]": StatsModule,
 * "compilation.chunks[]": StatsChunk,
 * "compilation.entrypoints[]": StatsChunkGroup,
 * "compilation.namedChunkGroups[]": StatsChunkGroup,
 * "compilation.errors[]": StatsError,
 * "compilation.warnings[]": StatsError,
 * "compilation.hints[]": StatsError,
 * "compilation.logging[]": StatsLogging & { name: string },
 * "compilation.children[]": StatsCompilation,
 * "asset.related[]": StatsAsset,
 * "asset.children[]": StatsAsset,
 * "module.modules[]": StatsModule,
 * "module.children[]": StatsModule,
 * "module.reasons[]": StatsModuleReason,
 * "moduleReason.children[]": StatsModuleReason,
 * "module.issuerPath[]": StatsModuleIssuer,
 * "chunk.origins[]": StatsChunkOrigin,
 * "chunk.modules[]": StatsModule,
 * "loggingGroup.entries[]": StatsLoggingEntry,
 * "loggingEntry.children[]": StatsLoggingEntry,
 * "error.moduleTrace[]": StatsModuleTraceItem,
 * "error.errors[]": StatsError,
 * "moduleTraceItem.dependencies[]": StatsModuleTraceDependency,
 * }} StatsPrinterItemNameKeys
 */

// TODO in the next major release: drop the open `for(key: string)` overloads,
// so a key missing from the `StatsPrinter*Keys` registries is a type error

/**
 * `sortItems` hooks: the exact items for array paths in `StatsPrinterItemKeys`, open for others.
 * @typedef {{
 * for<K extends keyof StatsPrinterItemKeys>(key: K): SyncBailHook<[StatsPrinterItemKeys[K][], StatsPrinterContext], boolean | void>,
 * for(key: string): SyncBailHook<[StatsPluginValue[], StatsPrinterContext], boolean | void>
 * } & HookMap<SyncBailHook<[StatsPluginValue[], StatsPrinterContext], boolean | void>>} StatsPrinterSortItemsHookMap
 */

/**
 * `getItemName` hooks of the keys in `StatsPrinterItemNameKeys`, with their exact item.
 * @typedef {{
 * for<K extends keyof StatsPrinterItemNameKeys>(key: K): SyncBailHook<[StatsPrinterItemNameKeys[K], StatsPrinterContext], string | void>
 * }} KnownStatsPrinterGetItemNameHookMap
 */

/**
 * `getItemName` hooks: the exact item for keys in `StatsPrinterItemNameKeys`, open for others.
 * @typedef {KnownStatsPrinterGetItemNameHookMap & { for(key: string): SyncBailHook<[StatsPluginValue, StatsPrinterContext], string | void> } & HookMap<SyncBailHook<[StatsPluginValue, StatsPrinterContext], string | void>>} StatsPrinterGetItemNameHookMap
 */

/**
 * `print` hooks of the keys in `StatsPrinterPrintKeys`, with their exact value.
 * @typedef {{
 * for<K extends keyof StatsPrinterPrintKeys>(key: K): SyncBailHook<[StatsPrinterPrintKeys[K], StatsPrinterContext], string | undefined | void>
 * }} KnownStatsPrinterPrintHookMap
 */

/**
 * `print` hooks: the exact value for keys in `StatsPrinterPrintKeys`, open for others.
 * @typedef {KnownStatsPrinterPrintHookMap & { for(key: string): SyncBailHook<[StatsPluginValue, StatsPrinterContext], string | undefined | void> } & HookMap<SyncBailHook<[StatsPluginValue, StatsPrinterContext], string | undefined | void>>} StatsPrinterPrintHookMap
 */

/**
 * Represents the stats printer runtime component.
 * @typedef {object} StatsPrintHooks
 * @property {HookMap<SyncBailHook<[string[], StatsPrinterContext], void>>} sortElements
 * @property {HookMap<SyncBailHook<[PrintedElement[], StatsPrinterContext], string | undefined | void>>} printElements
 * @property {StatsPrinterSortItemsHookMap} sortItems
 * @property {StatsPrinterGetItemNameHookMap} getItemName
 * @property {HookMap<SyncBailHook<[string[], StatsPrinterContext], string | undefined>>} printItems
 * @property {StatsPrinterPrintHookMap} print
 * @property {HookMap<SyncWaterfallHook<[string, StatsPrinterContext]>>} result
 */

/**
 * The item type of a printed value that is a list, `never` for other values.
 * @template T
 * @typedef {T extends (infer I)[] ? I : never} PrintedItem
 */

/**
 * The hooks `_print` calls with the printed value, typed by it: every level of a type
 * (`compilation.assets[].asset`, `assets[].asset`, `asset`) receives the same value.
 * @template T
 * @typedef {object} PrintHooks
 * @property {HookMap<SyncBailHook<[T, StatsPrinterContext], string | undefined | void>>} print
 * @property {HookMap<SyncBailHook<[PrintedItem<T>[], StatsPrinterContext], boolean | void>>} sortItems
 * @property {HookMap<SyncBailHook<[PrintedItem<T>, StatsPrinterContext], string | void>>} getItemName
 */

/**
 * Tells whether a printed value is a list, whose items are printed one by one.
 * @template T
 * @param {T} value printed value
 * @returns {value is T & PrintedItem<T>[]} true when it is a list
 */
const isPrintedList = (value) => Array.isArray(value);

class StatsPrinter {
	constructor() {
		/** @type {StatsPrintHooks} */
		const hooks = {
			sortElements: new HookMap(
				() => new SyncBailHook(["elements", "context"])
			),
			printElements: new HookMap(
				() => new SyncBailHook(["printedElements", "context"])
			),
			sortItems: new HookMap(() => new SyncBailHook(["items", "context"])),
			getItemName: new HookMap(() => new SyncBailHook(["item", "context"])),
			printItems: new HookMap(
				() => new SyncBailHook(["printedItems", "context"])
			),
			print: new HookMap(() => new SyncBailHook(["object", "context"])),
			result: new HookMap(() => new SyncWaterfallHook(["result", "context"]))
		};
		/** @type {StatsPrintHooks} */
		this.hooks = Object.freeze(hooks);
		/**
		 * The level keys of each type, from the type itself to its last part.
		 * @type {Map<string, string[]>}
		 */
		this._levelKeys = new Map();
		/** @type {boolean} */
		this._inPrint = false;
	}

	/**
	 * Returns the level keys of a type: `a.b.c` has `a.b.c`, `b.c` and `c`.
	 * @private
	 * @param {string} type type
	 * @returns {string[]} level keys
	 */
	_getLevelKeys(type) {
		const cacheEntry = this._levelKeys.get(type);
		if (cacheEntry !== undefined) {
			return cacheEntry;
		}
		/** @type {string[]} */
		const keys = [];
		const typeParts = type.split(".");
		for (let i = 0; i < typeParts.length; i++) {
			keys.push(typeParts.slice(i).join("."));
		}
		this._levelKeys.set(type, keys);
		return keys;
	}

	/**
	 * Calls `fn` with the hook of each level of `type` until one returns a value.
	 * @private
	 * @template H
	 * @template R
	 * @param {HookMap<H>} hookMap hook map
	 * @param {string} type type
	 * @param {(hook: H) => R | undefined | void} fn fn
	 * @returns {R | undefined} the first value `fn` returns
	 */
	_forEachLevel(hookMap, type, fn) {
		for (const key of this._getLevelKeys(type)) {
			const hook = hookMap.get(key);
			if (hook === undefined) continue;
			const result = fn(hook);
			if (result !== undefined) return result;
		}
	}

	/**
	 * Passes `data` through `fn` with the hook of each level of `type`.
	 * @private
	 * @template H
	 * @param {HookMap<H>} hookMap hook map
	 * @param {string} type type
	 * @param {string} data data
	 * @param {(hook: H, data: string) => string} fn fn
	 * @returns {string | undefined} result of `fn`
	 */
	_forEachLevelWaterfall(hookMap, type, data, fn) {
		for (const key of this._getLevelKeys(type)) {
			const hook = hookMap.get(key);
			if (hook !== undefined) data = fn(hook, data);
		}
		return data;
	}

	/**
	 * Returns printed result.
	 * @template T
	 * @param {string} type The type
	 * @param {T} object Object to print
	 * @param {StatsPrinterContext=} baseContext The base context
	 * @returns {string | undefined} printed result
	 */
	print(type, object, baseContext) {
		if (this._inPrint) {
			return this._print(type, object, baseContext);
		}
		try {
			this._inPrint = true;
			return this._print(type, object, baseContext);
		} finally {
			this._levelKeys.clear();
			this._inPrint = false;
		}
	}

	/**
	 * Returns printed result.
	 * @private
	 * @template T
	 * @param {string} type type
	 * @param {T} object object
	 * @param {StatsPrinterContext=} baseContext context
	 * @returns {string | undefined} printed result
	 */
	_print(type, object, baseContext) {
		/** @type {PrintHooks<T>} */
		const hooks = this.hooks;
		/** @type {StatsPrinterContext} */
		const context = {
			...baseContext,
			type,
			[type]: object
		};

		/** @type {string | undefined} */
		let printResult = this._forEachLevel(hooks.print, type, (hook) =>
			hook.call(object, context)
		);
		if (printResult === undefined) {
			if (isPrintedList(object)) {
				/** @type {PrintedItem<T>[]} */
				const sortedItems = [...object];
				this._forEachLevel(hooks.sortItems, type, (h) =>
					h.call(
						sortedItems,
						/** @type {StatsPrinterContextWithExtra} */
						(context)
					)
				);
				const printedItems = sortedItems.map((item, i) => {
					const itemContext =
						/** @type {StatsPrinterContextWithExtra} */
						({
							...context,
							_index: i
						});
					const itemName = this._forEachLevel(
						hooks.getItemName,
						`${type}[]`,
						(h) => h.call(item, itemContext)
					);
					if (itemName) itemContext[itemName] = item;
					return this.print(
						itemName ? `${type}[].${itemName}` : `${type}[]`,
						item,
						itemContext
					);
				});
				printResult = this._forEachLevel(this.hooks.printItems, type, (h) =>
					h.call(
						/** @type {string[]} */ (printedItems),
						/** @type {StatsPrinterContextWithExtra} */
						(context)
					)
				);
				if (printResult === undefined) {
					const result = printedItems.filter(Boolean);
					if (result.length > 0) printResult = result.join("\n");
				}
			} else if (object !== null && typeof object === "object") {
				const elements = Object.keys(object).filter(
					(key) =>
						/** @type {Record<string, StatsJsonValue>} */ (object)[key] !==
						undefined
				);
				this._forEachLevel(this.hooks.sortElements, type, (h) =>
					h.call(
						elements,
						/** @type {StatsPrinterContextWithExtra} */
						(context)
					)
				);
				const printedElements = elements.map((element) => {
					const content = this.print(
						`${type}.${element}`,
						/** @type {Record<string, StatsJsonValue>} */ (object)[element],
						{
							...context,
							_parent: object,
							_element: element,
							[element]: /** @type {Record<string, StatsJsonValue>} */ (object)[
								element
							]
						}
					);
					return { element, content };
				});
				printResult = this._forEachLevel(this.hooks.printElements, type, (h) =>
					h.call(
						printedElements,
						/** @type {StatsPrinterContextWithExtra} */
						(context)
					)
				);
				if (printResult === undefined) {
					const result = printedElements.map((e) => e.content).filter(Boolean);
					if (result.length > 0) printResult = result.join("\n");
				}
			}
		}

		return this._forEachLevelWaterfall(
			this.hooks.result,
			type,
			/** @type {string} */
			(printResult),
			(h, r) => h.call(r, /** @type {StatsPrinterContextWithExtra} */ (context))
		);
	}
}

module.exports = StatsPrinter;
