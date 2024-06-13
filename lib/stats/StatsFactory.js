/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { HookMap, SyncBailHook, SyncWaterfallHook } = require("tapable");
const { concatComparators, keepOriginalOrder } = require("../util/comparators");
const smartGrouping = require("../util/smartGrouping");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../WebpackError")} WebpackError */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

/** @typedef {import("../util/smartGrouping").GroupConfig<any, object>} GroupConfig */

/**
 * @typedef {object} KnownStatsFactoryContext
 * @property {string} type
 * @property {function(string): string=} makePathsRelative
 * @property {Compilation=} compilation
 * @property {Set<Module>=} rootModules
 * @property {Map<string,Chunk[]>=} compilationFileToChunks
 * @property {Map<string,Chunk[]>=} compilationAuxiliaryFileToChunks
 * @property {RuntimeSpec=} runtime
 * @property {function(Compilation): WebpackError[]=} cachedGetErrors
 * @property {function(Compilation): WebpackError[]=} cachedGetWarnings
 */

/** @typedef {KnownStatsFactoryContext & Record<string, any>} StatsFactoryContext */

class StatsFactory {
	constructor() {
		this.hooks = Object.freeze({
			/** @type {HookMap<SyncBailHook<[object, any, StatsFactoryContext]>>} */
			extract: new HookMap(
				() => new SyncBailHook(["object", "data", "context"])
			),
			/** @type {HookMap<SyncBailHook<[any, StatsFactoryContext, number, number]>>} */
			filter: new HookMap(
				() => new SyncBailHook(["item", "context", "index", "unfilteredIndex"])
			),
			/** @type {HookMap<SyncBailHook<[(function(any, any): number)[], StatsFactoryContext]>>} */
			sort: new HookMap(() => new SyncBailHook(["comparators", "context"])),
			/** @type {HookMap<SyncBailHook<[any, StatsFactoryContext, number, number]>>} */
			filterSorted: new HookMap(
				() => new SyncBailHook(["item", "context", "index", "unfilteredIndex"])
			),
			/** @type {HookMap<SyncBailHook<[GroupConfig[], StatsFactoryContext]>>} */
			groupResults: new HookMap(
				() => new SyncBailHook(["groupConfigs", "context"])
			),
			/** @type {HookMap<SyncBailHook<[(function(any, any): number)[], StatsFactoryContext]>>} */
			sortResults: new HookMap(
				() => new SyncBailHook(["comparators", "context"])
			),
			/** @type {HookMap<SyncBailHook<[any, StatsFactoryContext, number, number]>>} */
			filterResults: new HookMap(
				() => new SyncBailHook(["item", "context", "index", "unfilteredIndex"])
			),
			/** @type {HookMap<SyncBailHook<[any[], StatsFactoryContext]>>} */
			merge: new HookMap(() => new SyncBailHook(["items", "context"])),
			/** @type {HookMap<SyncBailHook<[any[], StatsFactoryContext]>>} */
			result: new HookMap(() => new SyncWaterfallHook(["result", "context"])),
			/** @type {HookMap<SyncBailHook<[any, StatsFactoryContext]>>} */
			getItemName: new HookMap(() => new SyncBailHook(["item", "context"])),
			/** @type {HookMap<SyncBailHook<[any, StatsFactoryContext]>>} */
			getItemFactory: new HookMap(() => new SyncBailHook(["item", "context"]))
		});
		const hooks = this.hooks;
		this._caches =
			/** @type {Record<keyof typeof hooks, Map<string, SyncBailHook<[any[], StatsFactoryContext]>[]>>} */ ({});
		for (const key of Object.keys(hooks)) {
			this._caches[key] = new Map();
		}
		this._inCreate = false;
	}

	_getAllLevelHooks(hookMap, cache, type) {
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

	_forEachLevel(hookMap, cache, type, fn) {
		for (const hook of this._getAllLevelHooks(hookMap, cache, type)) {
			const result = fn(hook);
			if (result !== undefined) return result;
		}
	}

	_forEachLevelWaterfall(hookMap, cache, type, data, fn) {
		for (const hook of this._getAllLevelHooks(hookMap, cache, type)) {
			data = fn(hook, data);
		}
		return data;
	}

	_forEachLevelFilter(hookMap, cache, type, items, fn, forceClone) {
		const hooks = this._getAllLevelHooks(hookMap, cache, type);
		if (hooks.length === 0) return forceClone ? items.slice() : items;
		let i = 0;
		return items.filter((item, idx) => {
			for (const hook of hooks) {
				const r = fn(hook, item, idx, i);
				if (r !== undefined) {
					if (r) i++;
					return r;
				}
			}
			i++;
			return true;
		});
	}

	/**
	 * @param {string} type type
	 * @param {any} data factory data
	 * @param {Omit<StatsFactoryContext, "type">} baseContext context used as base
	 * @returns {any} created object
	 */
	create(type, data, baseContext) {
		if (this._inCreate) {
			return this._create(type, data, baseContext);
		} else {
			try {
				this._inCreate = true;
				return this._create(type, data, baseContext);
			} finally {
				for (const key of Object.keys(this._caches)) this._caches[key].clear();
				this._inCreate = false;
			}
		}
	}

	_create(type, data, baseContext) {
		const context = {
			...baseContext,
			type,
			[type]: data
		};
		if (Array.isArray(data)) {
			// run filter on unsorted items
			const items = this._forEachLevelFilter(
				this.hooks.filter,
				this._caches.filter,
				type,
				data,
				(h, r, idx, i) => h.call(r, context, idx, i),
				true
			);

			// sort items
			const comparators = [];
			this._forEachLevel(this.hooks.sort, this._caches.sort, type, h =>
				h.call(comparators, context)
			);
			if (comparators.length > 0) {
				items.sort(
					// @ts-expect-error number of arguments is correct
					concatComparators(...comparators, keepOriginalOrder(items))
				);
			}

			// run filter on sorted items
			const items2 = this._forEachLevelFilter(
				this.hooks.filterSorted,
				this._caches.filterSorted,
				type,
				items,
				(h, r, idx, i) => h.call(r, context, idx, i),
				false
			);

			// for each item
			let resultItems = items2.map((item, i) => {
				const itemContext = {
					...context,
					_index: i
				};

				// run getItemName
				const itemName = this._forEachLevel(
					this.hooks.getItemName,
					this._caches.getItemName,
					`${type}[]`,
					h => h.call(item, itemContext)
				);
				if (itemName) itemContext[itemName] = item;
				const innerType = itemName ? `${type}[].${itemName}` : `${type}[]`;

				// run getItemFactory
				const itemFactory =
					this._forEachLevel(
						this.hooks.getItemFactory,
						this._caches.getItemFactory,
						innerType,
						h => h.call(item, itemContext)
					) || this;

				// run item factory
				return itemFactory.create(innerType, item, itemContext);
			});

			// sort result items
			const comparators2 = [];
			this._forEachLevel(
				this.hooks.sortResults,
				this._caches.sortResults,
				type,
				h => h.call(comparators2, context)
			);
			if (comparators2.length > 0) {
				resultItems.sort(
					// @ts-expect-error number of arguments is correct
					concatComparators(...comparators2, keepOriginalOrder(resultItems))
				);
			}

			// group result items
			const groupConfigs = [];
			this._forEachLevel(
				this.hooks.groupResults,
				this._caches.groupResults,
				type,
				h => h.call(groupConfigs, context)
			);
			if (groupConfigs.length > 0) {
				resultItems = smartGrouping(resultItems, groupConfigs);
			}

			// run filter on sorted result items
			const finalResultItems = this._forEachLevelFilter(
				this.hooks.filterResults,
				this._caches.filterResults,
				type,
				resultItems,
				(h, r, idx, i) => h.call(r, context, idx, i),
				false
			);

			// run merge on mapped items
			let result = this._forEachLevel(
				this.hooks.merge,
				this._caches.merge,
				type,
				h => h.call(finalResultItems, context)
			);
			if (result === undefined) result = finalResultItems;

			// run result on merged items
			return this._forEachLevelWaterfall(
				this.hooks.result,
				this._caches.result,
				type,
				result,
				(h, r) => h.call(r, context)
			);
		} else {
			const object = {};

			// run extract on value
			this._forEachLevel(this.hooks.extract, this._caches.extract, type, h =>
				h.call(object, data, context)
			);

			// run result on extracted object
			return this._forEachLevelWaterfall(
				this.hooks.result,
				this._caches.result,
				type,
				object,
				(h, r) => h.call(r, context)
			);
		}
	}
}
module.exports = StatsFactory;
