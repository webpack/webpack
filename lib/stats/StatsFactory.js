/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { HookMap, SyncBailHook, SyncWaterfallHook } = require("tapable");
const smartGrouping = require("./smartGrouping");

/** @import Chunk from "../graph/Chunk" */
/** @import { OriginRecord } from "../graph/ChunkGroup" */
/** @import Compilation, { Asset } from "../Compilation" */
/** @import Dependency from "../graph/Dependency" */
/** @import Module from "../module/Module" */
/** @import ModuleGraphConnection from "../graph/ModuleGraphConnection" */
/** @import WebpackError from "../errors/WebpackError" */
/**
 * Defines the comparator type used by this module.
 * @template T
 * @typedef {import("../util/comparators").Comparator<T>} Comparator
 */
/** @import ModuleProfile from "../module/ModuleProfile" */
/** @import { RuntimeSpec } from "../util/runtime" */
/**
 * Defines the group config type used by this module.
 * @template T, R
 * @typedef {import("./smartGrouping").GroupConfig<T, R>} GroupConfig
 */
/**
 * @import {
 * 	ChunkGroupInfoWithName,
 * 	ModuleTrace,
 * 	PreprocessedAsset,
 * 	StatsAsset,
 * 	StatsAssetGroup,
 * 	StatsChunk,
 * 	StatsChunkGroup,
 * 	StatsChunkOrigin,
 * 	StatsCompilation,
 * 	StatsError,
 * 	StatsModule,
 * 	StatsModuleGroup,
 * 	StatsModuleIssuer,
 * 	StatsModuleReason,
 * 	StatsModuleReasonGroup,
 * 	StatsModuleTraceDependency,
 * 	StatsModuleTraceItem,
 * 	StatsProfile
 * } from "./DefaultStatsFactoryPlugin"
 */

/**
 * Defines the known stats factory context type used by this module.
 * A plugin types its own fields by declaration merging: `declare module "webpack" { interface KnownStatsFactoryContext { myField?: MyType } }`.
 * @augmentable
 * @typedef {object} KnownStatsFactoryContext
 * @property {string} type
 * @property {Compilation} compilation
 * @property {(path: string) => string} makePathsRelative
 * @property {Set<Module>} rootModules
 * @property {Map<string, Chunk[]>} compilationFileToChunks
 * @property {Map<string, Chunk[]>} compilationAuxiliaryFileToChunks
 * @property {RuntimeSpec} runtime
 * @property {(compilation: Compilation) => Error[]} cachedGetErrors
 * @property {(compilation: Compilation) => Error[]} cachedGetWarnings
 * @property {number=} _index the item's position in the list being created
 */

// TODO in the next major release: drop the `Record<string, EXPECTED_ANY>` fallback; fields go in `KnownStatsFactoryContext`
/** @typedef {KnownStatsFactoryContext & Record<string, EXPECTED_ANY>} StatsFactoryContext */

// StatsLogging StatsLoggingEntry

/**
 * Defines the stats object type used by this module.
 * @template T
 * @template F
 * @typedef {T extends Compilation ? StatsCompilation : T extends ChunkGroupInfoWithName ? StatsChunkGroup : T extends Chunk ? StatsChunk : T extends OriginRecord ? StatsChunkOrigin : T extends Module ? StatsModule : T extends ModuleGraphConnection ? StatsModuleReason : T extends Asset ? StatsAsset : T extends ModuleTrace ? StatsModuleTraceItem : T extends Dependency ? StatsModuleTraceDependency : T extends Error ? StatsError : T extends ModuleProfile ? StatsProfile : F} StatsObject
 */

/**
 * Defines the created object type used by this module.
 * @template T
 * @template F
 * @typedef {T extends ChunkGroupInfoWithName[] ? Record<string, StatsObject<ChunkGroupInfoWithName, F>> : T extends (infer V)[] ? StatsObject<V, F>[] : StatsObject<T, F>} CreatedObject
 */

/**
 * The `[object, data]` `extract` receives for each object key, which also types that key's `getItemFactory` data and `result` value.
 * A plugin types its own keys by declaration merging: `declare module "webpack" { interface StatsFactoryExtractKeys { "myPlugin.data": [MyObject, MyData] } }`.
 * @augmentable
 * @typedef {object} StatsFactoryExtractKeys
 * @property {[StatsCompilation, Compilation]} compilation
 * @property {[StatsAsset, PreprocessedAsset]} asset
 * @property {[StatsAsset, PreprocessedAsset]} asset$visible
 * @property {[StatsChunkGroup, ChunkGroupInfoWithName]} chunkGroup
 * @property {[StatsModule, Module]} module
 * @property {[StatsModule, Module]} module$visible
 * @property {[StatsModuleIssuer, Module]} moduleIssuer
 * @property {[StatsProfile, ModuleProfile]} profile
 * @property {[StatsModuleReason, ModuleGraphConnection]} moduleReason
 * @property {[StatsChunk, Chunk]} chunk
 * @property {[StatsChunkOrigin, OriginRecord]} chunkOrigin
 * @property {[StatsError, WebpackError]} error
 * @property {[StatsError, WebpackError]} warning
 * @property {[StatsError, WebpackError]} cause
 * @property {[StatsModuleTraceItem, ModuleTrace]} moduleTraceItem
 * @property {[StatsModuleTraceDependency, Dependency]} moduleTraceDependency
 */

/**
 * The `[item, created item]` of each array path, typing its item hooks (`filter`, `sort`, `filterSorted`) and created item hooks (`sortResults`, `groupResults`, `filterResults`, `merge`); an optional third element is what `merge` makes of the created items, which `result` then gets instead of their array, so a key declaring one must register a `merge` tap returning that type.
 * A plugin types its own paths by declaration merging: `declare module "webpack" { interface StatsFactoryItemKeys { "myPlugin.items": [MyItem, MyCreatedItem] } }`.
 * @augmentable
 * @typedef {{
 * "compilation.assets": [PreprocessedAsset, StatsAsset],
 * "compilation.chunks": [Chunk, StatsChunk],
 * "compilation.modules": [Module, StatsModule],
 * "compilation.entrypoints": [ChunkGroupInfoWithName, StatsChunkGroup, Record<string, StatsChunkGroup>],
 * "compilation.namedChunkGroups": [ChunkGroupInfoWithName, StatsChunkGroup, Record<string, StatsChunkGroup>],
 * "compilation.errors": [Error, StatsError],
 * "compilation.warnings": [Error, StatsError],
 * "compilation.hints": [Error, StatsError],
 * "compilation.children": [Compilation, StatsCompilation],
 * "asset.related": [PreprocessedAsset, StatsAsset],
 * "error.errors": [Error, StatsError],
 * "warning.errors": [Error, StatsError],
 * "chunk.modules": [Module, StatsModule],
 * "chunk.rootModules": [Module, StatsModule],
 * "chunk.origins": [OriginRecord, StatsChunkOrigin],
 * "module.issuerPath": [Module, StatsModuleIssuer],
 * "module.reasons": [ModuleGraphConnection, StatsModuleReason],
 * "module.modules": [Module, StatsModule],
 * "module.children": [Module, StatsModule],
 * moduleTrace: [ModuleTrace, StatsModuleTraceItem],
 * "moduleTraceItem.dependencies": [Dependency, StatsModuleTraceDependency],
 * }} StatsFactoryItemKeys
 */

/**
 * The value `result` gets for an array path: what `merge` made of its created items, else their array.
 * A key declaring a merged type must register a `merge` tap returning it, or `result` gets the plain array at runtime.
 * @template {keyof StatsFactoryItemKeys} K
 * @typedef {StatsFactoryItemKeys[K] extends [infer _Object, infer _Item, infer M] ? M : StatsFactoryItemKeys[K][1][]} StatsFactoryMergedItems
 */

/**
 * The group object `groupResults` taps create for each array path of `StatsFactoryItemKeys` they group.
 * A plugin types its own groups by declaration merging: `declare module "webpack" { interface StatsFactoryGroupKeys { "myPlugin.items": MyGroup } }`.
 * @augmentable
 * @typedef {{
 * "compilation.assets": StatsAssetGroup,
 * "asset.related": StatsAssetGroup,
 * "compilation.modules": StatsModuleGroup,
 * "chunk.modules": StatsModuleGroup,
 * "chunk.rootModules": StatsModuleGroup,
 * "module.modules": StatsModuleGroup,
 * "module.reasons": StatsModuleReasonGroup,
 * }} StatsFactoryGroupKeys
 */

/**
 * The group `groupResults` taps create for an array path: its `StatsFactoryGroupKeys` entry, else any object.
 * @template {keyof StatsFactoryItemKeys} K
 * @typedef {K extends keyof StatsFactoryGroupKeys ? StatsFactoryGroupKeys[K] : EXPECTED_OBJECT} StatsFactoryGroup
 */

/**
 * The item `getItemName` receives for each `<array path>[]` key: the first element of that path's `StatsFactoryItemKeys` entry.
 * A plugin types its own keys by declaration merging: `declare module "webpack" { interface StatsFactoryItemNameKeys { "myPlugin.items[]": MyItem } }`.
 * @augmentable
 * @typedef {{
 * "compilation.assets[]": PreprocessedAsset,
 * "compilation.chunks[]": Chunk,
 * "compilation.modules[]": Module,
 * "compilation.entrypoints[]": ChunkGroupInfoWithName,
 * "compilation.namedChunkGroups[]": ChunkGroupInfoWithName,
 * "compilation.errors[]": Error,
 * "compilation.warnings[]": Error,
 * "compilation.hints[]": Error,
 * "compilation.children[]": Compilation,
 * "asset.related[]": PreprocessedAsset,
 * "error.errors[]": Error,
 * "warning.errors[]": Error,
 * "chunk.modules[]": Module,
 * "chunk.rootModules[]": Module,
 * "chunk.origins[]": OriginRecord,
 * "module.issuerPath[]": Module,
 * "module.reasons[]": ModuleGraphConnection,
 * "module.modules[]": Module,
 * "module.children[]": Module,
 * "moduleTrace[]": ModuleTrace,
 * "moduleTraceItem.dependencies[]": Dependency,
 * }} StatsFactoryItemNameKeys
 */

// TODO in the next major release: drop the open `for(key: string)` overloads,
// so a key missing from the `StatsFactory*Keys` registries is a type error

/**
 * A value under a stats key a plugin registers, whose shape webpack does not know.
 * @typedef {EXPECTED_ANY} StatsPluginValue
 */

/**
 * `extract` hooks of the keys in `StatsFactoryExtractKeys`, with their exact `[object, data]`.
 * @typedef {{
 * for<K extends keyof StatsFactoryExtractKeys>(key: K): SyncBailHook<[StatsFactoryExtractKeys[K][0], StatsFactoryExtractKeys[K][1], StatsFactoryContext], void>
 * }} KnownStatsFactoryExtractHookMap
 */

/**
 * `extract` hooks: the exact `[object, data]` for keys in `StatsFactoryExtractKeys`, open for others.
 * @typedef {KnownStatsFactoryExtractHookMap & { for(key: string): SyncBailHook<[StatsPluginValue, StatsPluginValue, StatsFactoryContext], void> } & HookMap<SyncBailHook<[StatsPluginValue, StatsPluginValue, StatsFactoryContext], void>>} StatsFactoryExtractHookMap
 */

/**
 * Filter hooks over the exact item of the array paths in `StatsFactoryItemKeys`.
 * @typedef {{
 * for<K extends keyof StatsFactoryItemKeys>(key: K): SyncBailHook<[StatsFactoryItemKeys[K][0], StatsFactoryContext, number, number], boolean | void>
 * }} KnownStatsFactoryItemFilterHookMap
 */

/**
 * Filter hooks over the item: exact for array paths in `StatsFactoryItemKeys`, open for others.
 * @typedef {KnownStatsFactoryItemFilterHookMap & { for(key: string): SyncBailHook<[StatsPluginValue, StatsFactoryContext, number, number], boolean | void> } & HookMap<SyncBailHook<[StatsPluginValue, StatsFactoryContext, number, number], boolean | void>>} StatsFactoryItemFilterHookMap
 */

/**
 * Sort hooks over the exact item of the array paths in `StatsFactoryItemKeys`.
 * @typedef {{
 * for<K extends keyof StatsFactoryItemKeys>(key: K): SyncBailHook<[Comparator<StatsFactoryItemKeys[K][0]>[], StatsFactoryContext], void>
 * }} KnownStatsFactoryItemSortHookMap
 */

/**
 * Sort hooks over the item: exact for array paths in `StatsFactoryItemKeys`, open for others.
 * @typedef {KnownStatsFactoryItemSortHookMap & { for(key: string): SyncBailHook<[Comparator<StatsPluginValue>[], StatsFactoryContext], void> } & HookMap<SyncBailHook<[Comparator<StatsPluginValue>[], StatsFactoryContext], void>>} StatsFactoryItemSortHookMap
 */

/**
 * Filter hooks over the exact created item of the array paths in `StatsFactoryItemKeys`.
 * @typedef {{
 * for<K extends keyof StatsFactoryItemKeys>(key: K): SyncBailHook<[StatsFactoryItemKeys[K][1], StatsFactoryContext, number, number], boolean | void>
 * }} KnownStatsFactoryResultFilterHookMap
 */

/**
 * Filter hooks over the created item: exact for array paths in `StatsFactoryItemKeys`, open for others.
 * @typedef {KnownStatsFactoryResultFilterHookMap & { for(key: string): SyncBailHook<[StatsPluginValue, StatsFactoryContext, number, number], boolean | void> } & HookMap<SyncBailHook<[StatsPluginValue, StatsFactoryContext, number, number], boolean | void>>} StatsFactoryResultFilterHookMap
 */

/**
 * Sort hooks over the exact created item of the array paths in `StatsFactoryItemKeys`.
 * @typedef {{
 * for<K extends keyof StatsFactoryItemKeys>(key: K): SyncBailHook<[Comparator<StatsFactoryItemKeys[K][1]>[], StatsFactoryContext], void>
 * }} KnownStatsFactoryResultSortHookMap
 */

/**
 * Sort hooks over the created item: exact for array paths in `StatsFactoryItemKeys`, open for others.
 * @typedef {KnownStatsFactoryResultSortHookMap & { for(key: string): SyncBailHook<[Comparator<StatsPluginValue>[], StatsFactoryContext], void> } & HookMap<SyncBailHook<[Comparator<StatsPluginValue>[], StatsFactoryContext], void>>} StatsFactoryResultSortHookMap
 */

/**
 * `groupResults` hooks of the array paths in `StatsFactoryItemKeys`, with group configs over their exact created item and `StatsFactoryGroup`.
 * @typedef {{
 * for<K extends keyof StatsFactoryItemKeys>(key: K): SyncBailHook<[GroupConfig<StatsFactoryItemKeys[K][1], StatsFactoryGroup<K>>[], StatsFactoryContext], void>
 * }} KnownStatsFactoryGroupResultsHookMap
 */

/**
 * `groupResults` hooks: group configs over the exact created item and its `StatsFactoryGroup` for array paths in `StatsFactoryItemKeys`, open for others.
 * @typedef {KnownStatsFactoryGroupResultsHookMap & { for(key: string): SyncBailHook<[GroupConfig<StatsPluginValue, StatsPluginValue>[], StatsFactoryContext], void> } & HookMap<SyncBailHook<[GroupConfig<StatsPluginValue, StatsPluginValue>[], StatsFactoryContext], void>>} StatsFactoryGroupResultsHookMap
 */

/**
 * `merge` hooks of the array paths in `StatsFactoryItemKeys`, merging their exact created items into the third element a merged key declares.
 * @typedef {{
 * for<K extends keyof StatsFactoryItemKeys>(key: K): SyncBailHook<[StatsFactoryItemKeys[K][1][], StatsFactoryContext], StatsFactoryMergedItems<K> | void>
 * }} KnownStatsFactoryMergeHookMap
 */

/**
 * `merge` hooks: the exact created items for array paths in `StatsFactoryItemKeys`, merged into the third element a merged key declares.
 * A key declaring that element must tap here and return it, since `result` is typed by it.
 * @typedef {KnownStatsFactoryMergeHookMap & { for(key: string): SyncBailHook<[StatsPluginValue[], StatsFactoryContext], StatsPluginValue | void> } & HookMap<SyncBailHook<[StatsPluginValue[], StatsFactoryContext], StatsPluginValue>>} StatsFactoryMergeHookMap
 */

/**
 * `result` hooks: the exact object for keys in `StatsFactoryExtractKeys` and (merged) items for array paths in `StatsFactoryItemKeys`, open for others.
 * @typedef {{
 * for<K extends keyof StatsFactoryExtractKeys>(key: K): SyncBailHook<[StatsFactoryExtractKeys[K][0], StatsFactoryContext], StatsFactoryExtractKeys[K][0]>,
 * for<K extends keyof StatsFactoryItemKeys>(key: K): SyncBailHook<[StatsFactoryMergedItems<K>, StatsFactoryContext], StatsFactoryMergedItems<K>>,
 * for(key: string): SyncBailHook<[StatsPluginValue, StatsFactoryContext], StatsPluginValue>
 * } & HookMap<SyncBailHook<[StatsPluginValue, StatsFactoryContext], StatsPluginValue>>} StatsFactoryResultHookMap
 */

/**
 * `getItemName` hooks of the keys in `StatsFactoryItemNameKeys`, with their exact item.
 * @typedef {{
 * for<K extends keyof StatsFactoryItemNameKeys>(key: K): SyncBailHook<[StatsFactoryItemNameKeys[K], StatsFactoryContext], string | void>
 * }} KnownStatsFactoryGetItemNameHookMap
 */

/**
 * `getItemName` hooks: the exact item for keys in `StatsFactoryItemNameKeys`, open for others.
 * @typedef {KnownStatsFactoryGetItemNameHookMap & { for(key: string): SyncBailHook<[StatsPluginValue, StatsFactoryContext], string | void> } & HookMap<SyncBailHook<[StatsPluginValue, StatsFactoryContext], string | void>>} StatsFactoryGetItemNameHookMap
 */

/**
 * `getItemFactory` hooks of the item names in `StatsFactoryExtractKeys` and of child compilations, with their exact data.
 * @typedef {{
 * for<K extends keyof StatsFactoryExtractKeys>(key: K): SyncBailHook<[StatsFactoryExtractKeys[K][1], StatsFactoryContext], StatsFactory | void>,
 * for(key: "compilation.children[].compilation"): SyncBailHook<[Compilation, StatsFactoryContext], StatsFactory | void>
 * }} KnownStatsFactoryGetItemFactoryHookMap
 */

/**
 * `getItemFactory` hooks: the exact data for item names in `StatsFactoryExtractKeys`, open for others.
 * @typedef {KnownStatsFactoryGetItemFactoryHookMap & { for(key: string): SyncBailHook<[StatsPluginValue, StatsFactoryContext], StatsFactory | void> } & HookMap<SyncBailHook<[StatsPluginValue, StatsFactoryContext], StatsFactory | void>>} StatsFactoryGetItemFactoryHookMap
 */

/**
 * Defines the stats factory hooks type used by this module.
 * @typedef {object} StatsFactoryHooks
 * @property {StatsFactoryExtractHookMap} extract
 * @property {StatsFactoryItemFilterHookMap} filter
 * @property {StatsFactoryItemSortHookMap} sort
 * @property {StatsFactoryItemFilterHookMap} filterSorted
 * @property {StatsFactoryGroupResultsHookMap} groupResults
 * @property {StatsFactoryResultSortHookMap} sortResults
 * @property {StatsFactoryResultFilterHookMap} filterResults
 * @property {StatsFactoryMergeHookMap} merge
 * @property {StatsFactoryResultHookMap} result
 * @property {StatsFactoryGetItemNameHookMap} getItemName
 * @property {StatsFactoryGetItemFactoryHookMap} getItemFactory
 */

/**
 * The item type of factory data that is a list, `never` for other data.
 * @template FactoryData
 * @typedef {FactoryData extends (infer I)[] ? I : never} FactoryItem
 */

/**
 * The created object of each item of factory data that is a list.
 * @template FactoryData
 * @template FallbackCreatedObject
 * @typedef {CreatedObject<FactoryItem<FactoryData>, FallbackCreatedObject>} CreatedItem
 */

/**
 * The hooks `_create` calls for one `type`, typed by that call's data: every level of a type
 * (`compilation.modules[].module`, `modules[].module`, `module`) receives the same data and created object.
 * @template FactoryData
 * @template FallbackCreatedObject
 * @typedef {object} CreateHooks
 * @property {HookMap<SyncBailHook<[CreatedObject<FactoryData, FallbackCreatedObject>, FactoryData, StatsFactoryContext], void>>} extract
 * @property {HookMap<SyncBailHook<[FactoryItem<FactoryData>, StatsFactoryContext, number, number], boolean | void>>} filter
 * @property {HookMap<SyncBailHook<[Comparator<FactoryItem<FactoryData>>[], StatsFactoryContext], void>>} sort
 * @property {HookMap<SyncBailHook<[FactoryItem<FactoryData>, StatsFactoryContext, number, number], boolean | void>>} filterSorted
 * @property {HookMap<SyncBailHook<[GroupConfig<CreatedItem<FactoryData, FallbackCreatedObject>, CreatedItem<FactoryData, FallbackCreatedObject>>[], StatsFactoryContext], void>>} groupResults
 * @property {HookMap<SyncBailHook<[Comparator<CreatedItem<FactoryData, FallbackCreatedObject>>[], StatsFactoryContext], void>>} sortResults
 * @property {HookMap<SyncBailHook<[CreatedItem<FactoryData, FallbackCreatedObject>, StatsFactoryContext, number, number], boolean | void>>} filterResults
 * @property {HookMap<SyncBailHook<[CreatedItem<FactoryData, FallbackCreatedObject>[], StatsFactoryContext], CreatedObject<FactoryData, FallbackCreatedObject> | void>>} merge
 * @property {HookMap<SyncBailHook<[CreatedObject<FactoryData, FallbackCreatedObject>, StatsFactoryContext], CreatedObject<FactoryData, FallbackCreatedObject>>>} result
 * @property {HookMap<SyncBailHook<[FactoryItem<FactoryData>, StatsFactoryContext], string | void>>} getItemName
 * @property {HookMap<SyncBailHook<[FactoryItem<FactoryData>, StatsFactoryContext], StatsFactory | void>>} getItemFactory
 */

/**
 * Tells whether factory data is a list, whose items are created one by one.
 * @template FactoryData
 * @param {FactoryData} data factory data
 * @returns {data is FactoryData & FactoryItem<FactoryData>[]} true when it is a list
 */
const isFactoryDataList = (data) => Array.isArray(data);

class StatsFactory {
	constructor() {
		/** @type {StatsFactoryHooks} */
		const hooks = {
			extract: new HookMap(
				() => new SyncBailHook(["object", "data", "context"])
			),
			filter: new HookMap(
				() => new SyncBailHook(["item", "context", "index", "unfilteredIndex"])
			),
			sort: new HookMap(() => new SyncBailHook(["comparators", "context"])),
			filterSorted: new HookMap(
				() => new SyncBailHook(["item", "context", "index", "unfilteredIndex"])
			),
			groupResults: new HookMap(
				() => new SyncBailHook(["groupConfigs", "context"])
			),
			sortResults: new HookMap(
				() => new SyncBailHook(["comparators", "context"])
			),
			filterResults: new HookMap(
				() => new SyncBailHook(["item", "context", "index", "unfilteredIndex"])
			),
			merge: new HookMap(() => new SyncBailHook(["items", "context"])),
			result: new HookMap(() => new SyncWaterfallHook(["result", "context"])),
			getItemName: new HookMap(() => new SyncBailHook(["item", "context"])),
			getItemFactory: new HookMap(() => new SyncBailHook(["item", "context"]))
		};
		/** @type {StatsFactoryHooks} */
		this.hooks = Object.freeze(hooks);
		/**
		 * The level keys of each type, from the type itself to its last part.
		 * @type {Map<string, string[]>}
		 */
		this._levelKeys = new Map();
		/** @type {boolean} */
		this._inCreate = false;
	}

	/**
	 * Returns the level keys of a type: `a.b.c` has `a.b.c`, `b.c` and `c`.
	 * @param {string} type type
	 * @returns {string[]} level keys
	 * @private
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
	 * @template H
	 * @template R
	 * @param {HookMap<H>} hookMap hook map
	 * @param {string} type type
	 * @param {(hook: H) => R | void} fn fn
	 * @returns {R | void} the first value `fn` returns
	 * @private
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
	 * @template H
	 * @template D
	 * @param {HookMap<H>} hookMap hook map
	 * @param {string} type type
	 * @param {D} data data
	 * @param {(hook: H, data: D) => D} fn fn
	 * @returns {D} data
	 * @private
	 */
	_forEachLevelWaterfall(hookMap, type, data, fn) {
		for (const key of this._getLevelKeys(type)) {
			const hook = hookMap.get(key);
			if (hook !== undefined) data = fn(hook, data);
		}
		return data;
	}

	/**
	 * Filters `items` with the hooks of the levels of `type`; the first hook returning a value decides.
	 * @template H
	 * @template D
	 * @param {HookMap<H>} hookMap hook map
	 * @param {string} type type
	 * @param {D[]} items items
	 * @param {(hook: H, item: D, idx: number, i: number) => boolean | void} fn fn
	 * @param {boolean} forceClone force clone
	 * @returns {D[]} result for each level
	 * @private
	 */
	_forEachLevelFilter(hookMap, type, items, fn, forceClone) {
		/** @type {H[]} */
		const hooks = [];
		for (const key of this._getLevelKeys(type)) {
			const hook = hookMap.get(key);
			if (hook !== undefined) hooks.push(hook);
		}
		if (hooks.length === 0) return forceClone ? [...items] : items;
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
	 * Returns created object.
	 * @template FactoryData
	 * @template FallbackCreatedObject
	 * @param {string} type type
	 * @param {FactoryData} data factory data
	 * @param {Omit<StatsFactoryContext, "type">} baseContext context used as base
	 * @returns {CreatedObject<FactoryData, FallbackCreatedObject>} created object
	 */
	create(type, data, baseContext) {
		if (this._inCreate) {
			return this._create(type, data, baseContext);
		}
		try {
			this._inCreate = true;
			return this._create(type, data, baseContext);
		} finally {
			this._levelKeys.clear();
			this._inCreate = false;
		}
	}

	/**
	 * Returns created object.
	 * @private
	 * @template FactoryData
	 * @template FallbackCreatedObject
	 * @param {string} type type
	 * @param {FactoryData} data factory data
	 * @param {Omit<StatsFactoryContext, "type">} baseContext context used as base
	 * @returns {CreatedObject<FactoryData, FallbackCreatedObject>} created object
	 */
	_create(type, data, baseContext) {
		/** @type {CreateHooks<FactoryData, FallbackCreatedObject>} */
		const hooks = this.hooks;
		const context = /** @type {StatsFactoryContext} */ ({
			...baseContext,
			type,
			[type]: data
		});
		if (isFactoryDataList(data)) {
			// run filter on unsorted items
			const items = this._forEachLevelFilter(
				hooks.filter,
				type,
				data,
				(h, r, idx, i) => h.call(r, context, idx, i),
				true
			);

			// sort items
			/** @type {Comparator<FactoryItem<FactoryData>>[]} */
			const comparators = [];
			this._forEachLevel(hooks.sort, type, (h) => h.call(comparators, context));
			if (comparators.length > 0) {
				sortWithOriginalOrder(items, comparators);
			}

			// run filter on sorted items
			const items2 = this._forEachLevelFilter(
				hooks.filterSorted,
				type,
				items,
				(h, r, idx, i) => h.call(r, context, idx, i),
				false
			);

			// reuse one item context; create() spreads it synchronously, so mutating
			// `_index`/the name key between items is safe and skips a per-item spread
			/** @type {StatsFactoryContext} */
			const itemContext = { ...context };
			const itemNameType = `${type}[]`;
			/** @type {string | void} */
			let prevItemName;
			let resultItems = items2.map((item, i) => {
				itemContext._index = i;

				// run getItemName
				const itemName = this._forEachLevel(
					hooks.getItemName,
					itemNameType,
					(h) => h.call(item, itemContext)
				);
				// drop a previous item's name key before adding this one's
				if (prevItemName !== undefined && prevItemName !== itemName) {
					delete itemContext[prevItemName];
				}
				if (itemName) itemContext[itemName] = item;
				prevItemName = itemName;
				const innerType = itemName ? `${type}[].${itemName}` : itemNameType;

				// run getItemFactory
				const itemFactory =
					this._forEachLevel(hooks.getItemFactory, innerType, (h) =>
						h.call(item, itemContext)
					) || this;

				// run item factory; items fall back to the same shape as their array
				/** @type {CreatedItem<FactoryData, FallbackCreatedObject>} */
				const createdItem = itemFactory.create(innerType, item, itemContext);
				return createdItem;
			});

			// sort result items
			/** @type {Comparator<CreatedItem<FactoryData, FallbackCreatedObject>>[]} */
			const comparators2 = [];
			this._forEachLevel(hooks.sortResults, type, (h) =>
				h.call(comparators2, context)
			);
			if (comparators2.length > 0) {
				sortWithOriginalOrder(resultItems, comparators2);
			}

			// group result items
			/** @type {GroupConfig<CreatedItem<FactoryData, FallbackCreatedObject>, CreatedItem<FactoryData, FallbackCreatedObject>>[]} */
			const groupConfigs = [];
			this._forEachLevel(hooks.groupResults, type, (h) =>
				h.call(groupConfigs, context)
			);
			if (groupConfigs.length > 0) {
				resultItems = smartGrouping(resultItems, groupConfigs);
			}

			// run filter on sorted result items
			const finalResultItems = this._forEachLevelFilter(
				hooks.filterResults,
				type,
				resultItems,
				(h, r, idx, i) => h.call(r, context, idx, i),
				false
			);

			// run merge on mapped items
			/** @type {CreatedObject<FactoryData, FallbackCreatedObject> | void} */
			let result = this._forEachLevel(hooks.merge, type, (h) =>
				h.call(finalResultItems, context)
			);
			if (result === undefined) {
				// unmerged, the created object of an array is its created items
				result =
					/** @type {CreatedObject<FactoryData, FallbackCreatedObject>} */ (
						finalResultItems
					);
			}

			// run result on merged items
			return this._forEachLevelWaterfall(hooks.result, type, result, (h, r) =>
				h.call(r, context)
			);
		}
		const object =
			/** @type {CreatedObject<FactoryData, FallbackCreatedObject>} */ ({});

		// run extract on value
		this._forEachLevel(hooks.extract, type, (h) =>
			h.call(object, data, context)
		);

		// run result on extracted object
		return this._forEachLevelWaterfall(hooks.result, type, object, (h, r) =>
			h.call(r, context)
		);
	}
}

/**
 * Stable in-place sort applying comparators in order, keeping the original order
 * for equal items. Inlined instead of `concatComparators(...c, keepOriginalOrder())`
 * because that combination is single-use per sort and only thrashes the comparator
 * caches (a fresh tiebreaker closure every call allocates a new cache entry).
 * @template T
 * @param {T[]} items items to sort in place
 * @param {import("../util/comparators").Comparator<T>[]} comparators comparators applied in order
 * @returns {void}
 */
const sortWithOriginalOrder = (items, comparators) => {
	// original-index tiebreaker keeps the sort stable on engines without a stable Array.sort
	/** @type {Map<T, number>} */
	const originalOrder = new Map();
	for (let i = 0; i < items.length; i++) {
		originalOrder.set(items[i], i);
	}
	const count = comparators.length;
	items.sort((a, b) => {
		for (let i = 0; i < count; i++) {
			const res = comparators[i](a, b);
			if (res !== 0) return res;
		}
		return (
			/** @type {number} */ (originalOrder.get(a)) -
			/** @type {number} */ (originalOrder.get(b))
		);
	});
};

module.exports = StatsFactory;
