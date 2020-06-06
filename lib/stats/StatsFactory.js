/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { HookMap, SyncBailHook, SyncWaterfallHook } = require("tapable");
const { concatComparators, keepOriginalOrder } = require("../util/comparators");

class StatsFactory {
	constructor() {
		this.hooks = Object.freeze({
			/** @type {HookMap<SyncBailHook<[Object, any, Object]>>} */
			extract: new HookMap(
				() => new SyncBailHook(["object", "data", "context"])
			),
			/** @type {HookMap<SyncBailHook<[any, Object, number, number]>>} */
			filter: new HookMap(
				() => new SyncBailHook(["item", "context", "index", "unfilteredIndex"])
			),
			/** @type {HookMap<SyncBailHook<[(function(any, any): number)[], Object]>>} */
			sort: new HookMap(() => new SyncBailHook(["comparators", "context"])),
			/** @type {HookMap<SyncBailHook<[any, Object, number, number]>>} */
			filterSorted: new HookMap(
				() => new SyncBailHook(["item", "context", "index", "unfilteredIndex"])
			),
			/** @type {HookMap<SyncBailHook<[(function(any, any): number)[], Object]>>} */
			sortResults: new HookMap(
				() => new SyncBailHook(["comparators", "context"])
			),
			filterResults: new HookMap(
				() => new SyncBailHook(["item", "context", "index", "unfilteredIndex"])
			),
			/** @type {HookMap<SyncBailHook<[any[], Object]>>} */
			merge: new HookMap(() => new SyncBailHook(["items", "context"])),
			/** @type {HookMap<SyncBailHook<[any[], Object]>>} */
			result: new HookMap(() => new SyncWaterfallHook(["result", "context"])),
			/** @type {HookMap<SyncBailHook<[any, Object]>>} */
			getItemName: new HookMap(() => new SyncBailHook(["item", "context"])),
			/** @type {HookMap<SyncBailHook<[any, Object]>>} */
			getItemFactory: new HookMap(() => new SyncBailHook(["item", "context"]))
		});
		/** @type {Map<HookMap<SyncBailHook<[any[], Object]>>, Map<string, SyncBailHook<[any[], Object]>[]>>} */
		this._levelHookCache = new Map();
		this._inCreate = false;
	}

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

	_forEachLevel(hookMap, type, fn) {
		for (const hook of this._getAllLevelHooks(hookMap, type)) {
			const result = fn(hook);
			if (result !== undefined) return result;
		}
	}

	_forEachLevelWaterfall(hookMap, type, data, fn) {
		for (const hook of this._getAllLevelHooks(hookMap, type)) {
			data = fn(hook, data);
		}
		return data;
	}

	_forEachLevelFilter(hookMap, type, items, fn, forceClone) {
		const hooks = this._getAllLevelHooks(hookMap, type);
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

	create(type, data, baseContext) {
		if (this._inCreate) {
			return this._create(type, data, baseContext);
		} else {
			try {
				this._inCreate = true;
				return this._create(type, data, baseContext);
			} finally {
				this._levelHookCache.clear();
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
				type,
				data,
				(h, r, idx, i) => h.call(r, context, idx, i),
				true
			);

			// sort items
			const comparators = [];
			this._forEachLevel(this.hooks.sort, type, h =>
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
				type,
				items,
				(h, r, idx, i) => h.call(r, context, idx, i),
				false
			);

			// for each item
			const resultItems = items2.map((item, i) => {
				const itemContext = {
					...context,
					_index: i
				};

				// run getItemName
				const itemName = this._forEachLevel(
					this.hooks.getItemName,
					`${type}[]`,
					h => h.call(item, itemContext)
				);
				if (itemName) itemContext[itemName] = item;
				const innerType = itemName ? `${type}[].${itemName}` : `${type}[]`;

				// run getItemFactory
				const itemFactory =
					this._forEachLevel(this.hooks.getItemFactory, innerType, h =>
						h.call(item, itemContext)
					) || this;

				// run item factory
				return itemFactory.create(innerType, item, itemContext);
			});

			// sort result items
			const comparators2 = [];
			this._forEachLevel(this.hooks.sortResults, type, h =>
				h.call(comparators2, context)
			);
			if (comparators2.length > 0) {
				resultItems.sort(
					// @ts-expect-error number of arguments is correct
					concatComparators(...comparators2, keepOriginalOrder(resultItems))
				);
			}

			// run filter on sorted result items
			const finalResultItems = this._forEachLevelFilter(
				this.hooks.filterResults,
				type,
				resultItems,
				(h, r, idx, i) => h.call(r, context, idx, i),
				false
			);

			// run merge on mapped items
			let result = this._forEachLevel(this.hooks.merge, type, h =>
				h.call(finalResultItems, context)
			);
			if (result === undefined) result = finalResultItems;

			// run result on merged items
			return this._forEachLevelWaterfall(
				this.hooks.result,
				type,
				result,
				(h, r) => h.call(r, context)
			);
		} else {
			const object = {};

			// run extract on value
			this._forEachLevel(this.hooks.extract, type, h =>
				h.call(object, data, context)
			);

			// run result on extracted object
			return this._forEachLevelWaterfall(
				this.hooks.result,
				type,
				object,
				(h, r) => h.call(r, context)
			);
		}
	}
}
module.exports = StatsFactory;
