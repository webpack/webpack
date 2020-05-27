/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Factory = require("enhanced-resolve").ResolverFactory;
const { HookMap, SyncHook, SyncWaterfallHook } = require("tapable");
const { cachedCleverMerge } = require("./util/cleverMerge");

/** @typedef {import("enhanced-resolve").Resolver} Resolver */

/**
 * @typedef {Object} WithOptions
 * @property {function(Object): ResolverWithOptions} withOptions create a resolver with additional/different options
 */

/** @typedef {Resolver & WithOptions} ResolverWithOptions */

const EMPTY_RESOLVE_OPTIONS = {};

/**
 * @typedef {Object} ResolverCache
 * @property {WeakMap<Object, ResolverWithOptions>} direct
 * @property {Map<string, ResolverWithOptions>} stringified
 */

module.exports = class ResolverFactory {
	constructor() {
		this.hooks = Object.freeze({
			/** @type {HookMap<SyncWaterfallHook<[Object, string]>>} */
			resolveOptions: new HookMap(
				() => new SyncWaterfallHook(["resolveOptions", "category"])
			),
			/** @type {HookMap<SyncHook<[Resolver, Object, Object, string]>>} */
			resolver: new HookMap(
				() =>
					new SyncHook([
						"resolver",
						"resolveOptions",
						"userResolveOptions",
						"category"
					])
			)
		});
		/** @type {Map<string, ResolverCache>} */
		this.cache = new Map();
	}

	/**
	 * @param {string} type type of resolver
	 * @param {Object=} resolveOptions options
	 * @param {string=} category dependency category if any
	 * @returns {ResolverWithOptions} the resolver
	 */
	get(type, resolveOptions = EMPTY_RESOLVE_OPTIONS, category = "unknown") {
		const typedCacheId = category === "esm" ? type : `${type}-${category}`;
		let typedCaches = this.cache.get(typedCacheId);
		if (!typedCaches) {
			typedCaches = {
				direct: new WeakMap(),
				stringified: new Map()
			};
			this.cache.set(typedCacheId, typedCaches);
		}
		const cachedResolver = typedCaches.direct.get(resolveOptions);
		if (cachedResolver) {
			return cachedResolver;
		}
		const ident = JSON.stringify(resolveOptions);
		const resolver = typedCaches.stringified.get(ident);
		if (resolver) {
			typedCaches.direct.set(resolveOptions, resolver);
			return resolver;
		}
		const newResolver = this._create(type, resolveOptions, category);
		typedCaches.direct.set(resolveOptions, newResolver);
		typedCaches.stringified.set(ident, newResolver);
		return newResolver;
	}

	/**
	 * @param {string} type type of resolver
	 * @param {Object} resolveOptions options
	 * @param {string} category category
	 * @returns {ResolverWithOptions} the resolver
	 */
	_create(type, resolveOptions, category) {
		const originalResolveOptions = { ...resolveOptions };
		resolveOptions = this.hooks.resolveOptions
			.for(type)
			.call(resolveOptions, category);
		const resolver = /** @type {ResolverWithOptions} */ (Factory.createResolver(
			resolveOptions
		));
		if (!resolver) {
			throw new Error("No resolver created");
		}
		/** @type {Map<Object, ResolverWithOptions>} */
		const childCache = new Map();
		resolver.withOptions = options => {
			const cacheEntry = childCache.get(options);
			if (cacheEntry !== undefined) return cacheEntry;
			const mergedOptions = cachedCleverMerge(originalResolveOptions, options);
			const resolver = this.get(type, mergedOptions, category);
			childCache.set(options, resolver);
			return resolver;
		};
		this.hooks.resolver
			.for(type)
			.call(resolver, resolveOptions, originalResolveOptions, category);
		return resolver;
	}
};
