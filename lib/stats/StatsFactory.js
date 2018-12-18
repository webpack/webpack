/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { HookMap, SyncBailHook, SyncWaterfallHook } = require("tapable");
const { concatComparators, keepOriginalOrder } = require("../util/comparators");

const forEachLevel = (hookMap, type, fn) => {
	const typeParts = type.split(".");
	for (let i = 0; i < typeParts.length; i++) {
		const hook = hookMap.get(typeParts.slice(i).join("."));
		if (hook) {
			const result = fn(hook);
			if (result !== undefined) return result;
		}
	}
};

const forEachLevelWaterfall = (hookMap, type, data, fn) => {
	const typeParts = type.split(".");
	for (let i = 0; i < typeParts.length; i++) {
		const hook = hookMap.get(typeParts.slice(i).join("."));
		if (hook) {
			data = fn(hook, data);
		}
	}
	return data;
};

const forEachLevelFilter = (hookMap, type, items, fn, forceClone) => {
	const typeParts = type.split(".");
	const hooks = [];
	for (let i = 0; i < typeParts.length; i++) {
		const hook = hookMap.get(typeParts.slice(i).join("."));
		if (hook) {
			hooks.push((item, idx, i) => fn(hook, item, idx, i));
		}
	}
	if (hooks.length === 0) return forceClone ? items.slice() : items;
	let i = 0;
	return items.filter((item, idx) => {
		for (const h of hooks) {
			const r = h(item, idx, i);
			if (r !== undefined) {
				if (r) i++;
				return r;
			}
		}
		i++;
		return true;
	});
};

class StatsFactory {
	constructor() {
		this.hooks = Object.freeze({
			/** @type {HookMap<Object, any, Object>} */
			extract: new HookMap(
				() => new SyncBailHook(["object", "data", "context"])
			),
			/** @type {HookMap<any, Object, number, number>} */
			filter: new HookMap(
				() => new SyncBailHook(["item", "context", "index", "unfilteredIndex"])
			),
			/** @type {HookMap<(function(any, any): number)[], Object>} */
			sort: new HookMap(() => new SyncBailHook(["comparators", "context"])),
			/** @type {HookMap<any, Object, number, number>} */
			filterSorted: new HookMap(
				() => new SyncBailHook(["item", "context", "index", "unfilteredIndex"])
			),
			/** @type {HookMap<(function(any, any): number)[], Object>} */
			sortResults: new HookMap(
				() => new SyncBailHook(["comparators", "context"])
			),
			filterResults: new HookMap(
				() => new SyncBailHook(["item", "context", "index", "unfilteredIndex"])
			),
			/** @type {HookMap<any[], Object>} */
			merge: new HookMap(() => new SyncBailHook(["items", "context"])),
			/** @type {HookMap<any[], Object>} */
			result: new HookMap(() => new SyncWaterfallHook(["result", "context"])),
			/** @type {HookMap<any, Object>} */
			getItemName: new HookMap(() => new SyncBailHook(["item", "context"])),
			/** @type {HookMap<any, Object>} */
			getItemFactory: new HookMap(() => new SyncBailHook(["item", "context"]))
		});
	}

	create(type, data, baseContext) {
		const context = Object.assign({}, baseContext, {
			type,
			[type]: data
		});
		if (Array.isArray(data)) {
			// run filter on unsorted items
			const items = forEachLevelFilter(
				this.hooks.filter,
				type,
				data,
				(h, r, idx, i) => h.call(r, context, idx, i),
				true
			);

			// sort items
			const comparators = [];
			forEachLevel(this.hooks.sort, type, h => h.call(comparators, context));
			if (comparators.length > 0) {
				items.sort(
					// @ts-ignore number of arguments is correct
					concatComparators(...comparators, keepOriginalOrder(items))
				);
			}

			// run filter on sorted items
			const items2 = forEachLevelFilter(
				this.hooks.filterSorted,
				type,
				items,
				(h, r, idx, i) => h.call(r, context, idx, i),
				false
			);

			// for each item
			const resultItems = items2.map((item, i) => {
				const itemContext = Object.assign({}, context, {
					_index: i
				});

				// run getItemName
				const itemName = forEachLevel(this.hooks.getItemName, `${type}[]`, h =>
					h.call(item, itemContext)
				);
				if (itemName) itemContext[itemName] = item;
				const innerType = itemName ? `${type}[].${itemName}` : `${type}[]`;

				// run getItemFactory
				const itemFactory =
					forEachLevel(this.hooks.getItemFactory, innerType, h =>
						h.call(item, itemContext)
					) || this;

				// run item factory
				return itemFactory.create(innerType, item, itemContext);
			});

			// sort result items
			const comparators2 = [];
			forEachLevel(this.hooks.sortResults, type, h =>
				h.call(comparators2, context)
			);
			if (comparators2.length > 0) {
				resultItems.sort(
					// @ts-ignore number of arguments is correct
					concatComparators(...comparators2, keepOriginalOrder(resultItems))
				);
			}

			// run filter on sorted result items
			const finalResultItems = forEachLevelFilter(
				this.hooks.filterResults,
				type,
				resultItems,
				(h, r, idx, i) => h.call(r, context, idx, i),
				false
			);

			// run merge on mapped items
			let result = forEachLevel(this.hooks.merge, type, h =>
				h.call(finalResultItems, context)
			);
			if (result === undefined) result = finalResultItems;

			// run result on merged items
			return forEachLevelWaterfall(this.hooks.result, type, result, (h, r) =>
				h.call(r, context)
			);
		} else {
			const object = {};

			// run extract on value
			forEachLevel(this.hooks.extract, type, h =>
				h.call(object, data, context)
			);

			// run result on extracted object
			return forEachLevelWaterfall(this.hooks.result, type, object, (h, r) =>
				h.call(r, context)
			);
		}
	}
}
module.exports = StatsFactory;
