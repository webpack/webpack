/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/**
 * @typedef {Object} GroupOptions
 * @property {boolean=} groupChildren
 * @property {boolean=} force
 * @property {boolean=} greedy
 */

/**
 * @template T
 * @template R
 * @typedef {Object} GroupConfig
 * @property {function(T): string[]} getKeys
 * @property {function(string, (R | T)[], T[]): R} createGroup
 * @property {function(string, T[]): GroupOptions=} getOptions
 */

/**
 * @template T
 * @typedef {Object} ItemWithGroups
 * @property {T} item
 * @property {Set<string>} groups
 */

/**
 * @template T
 * @template R
 * @param {T[]} items the list of items
 * @param {GroupConfig<T, R>[]} groupConfigs configuration
 * @returns {(R | T)[]} grouped items
 */
const smartGrouping = (items, groupConfigs) => {
	/** @type {Set<ItemWithGroups<T>>} */
	const itemsWithGroups = new Set();
	/** @type {Map<string, [GroupConfig<T, R>, string]>} */
	const groupConfigMap = new Map();
	for (const item of items) {
		const groups = new Set();
		for (let i = 0; i < groupConfigs.length; i++) {
			const groupConfig = groupConfigs[i];
			const keys = groupConfig.getKeys(item);
			if (keys) {
				for (const group of keys) {
					const fullGroup = `${i}:${group}`;
					if (!groupConfigMap.has(fullGroup)) {
						groupConfigMap.set(fullGroup, [groupConfig, group]);
					}
					groups.add(fullGroup);
				}
			}
		}
		itemsWithGroups.add({
			item,
			groups
		});
	}
	const alreadyGrouped = new Set();
	/**
	 * @param {Set<ItemWithGroups<T>>} itemsWithGroups input items with groups
	 * @returns {(T | R)[]} groups items
	 */
	const runGrouping = itemsWithGroups => {
		const totalSize = itemsWithGroups.size;
		/** @type {Map<string, Set<ItemWithGroups<T>>>} */
		const groupMap = new Map();
		for (const entry of itemsWithGroups) {
			for (const group of entry.groups) {
				if (alreadyGrouped.has(group)) continue;
				const list = groupMap.get(group);
				if (list === undefined) {
					groupMap.set(group, new Set([entry]));
				} else {
					list.add(entry);
				}
			}
		}
		/** @type {Set<string>} */
		const usedGroups = new Set();
		/** @type {(T | R)[]} */
		const results = [];
		for (;;) {
			let bestGroup = undefined;
			let bestGroupSize = -1;
			let bestGroupItems = undefined;
			let bestGroupOptions = undefined;
			for (const [group, items] of groupMap) {
				const [groupConfig, groupKey] = groupConfigMap.get(group);
				const options =
					groupConfig.getOptions &&
					groupConfig.getOptions(
						groupKey,
						Array.from(items, ({ item }) => item)
					);
				if (items.size === 0) continue;
				const force = options && options.force;
				if (!force) {
					if (usedGroups.has(group)) continue;
					if (items.size <= 1 || totalSize - items.size <= 1) {
						continue;
					}
				}
				const greedy = options && options.greedy;
				let sizeValue = greedy
					? items.size
					: Math.min(items.size, totalSize - items.size);
				if (sizeValue > bestGroupSize) {
					bestGroup = group;
					bestGroupSize = sizeValue;
					bestGroupItems = items;
					bestGroupOptions = options;
				}
			}
			if (bestGroup === undefined) {
				break;
			}
			const items = new Set(bestGroupItems);
			for (const item of items) {
				itemsWithGroups.delete(item);
				// Remove all groups that items have from the map to not select them again
				for (const group of item.groups) {
					const list = groupMap.get(group);
					if (list !== undefined) list.delete(item);
					usedGroups.add(group);
				}
			}
			const idx = bestGroup.indexOf(":");
			const configKey = bestGroup.slice(0, idx);
			const key = bestGroup.slice(idx + 1);
			const groupConfig = groupConfigs[+configKey];
			const options = bestGroupOptions;

			alreadyGrouped.add(bestGroup);
			const children =
				options && options.groupChildren === false
					? Array.from(items, ({ item }) => item)
					: runGrouping(items);
			alreadyGrouped.delete(bestGroup);

			results.push(
				groupConfig.createGroup(
					key,
					children,
					Array.from(items, ({ item }) => item)
				)
			);
		}
		for (const { item } of itemsWithGroups) {
			results.push(item);
		}
		return results;
	};
	return runGrouping(itemsWithGroups);
};

module.exports = smartGrouping;
