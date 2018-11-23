/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ResolverFactory: Factory } = require("enhanced-resolve");
const { HookMap, SyncHook, SyncWaterfallHook } = require("tapable");

/** @typedef {import("enhanced-resolve/lib/Resolver")} Resolver */

/**
 * @typedef {Object} ResolverCache
 * @property {WeakMap<Object, Resolver>} direct
 * @property {Map<string, Resolver>} stringified
 */

module.exports = class ResolverFactory {
	constructor() {
		this.hooks = Object.freeze({
			/** @type {HookMap<Object>} */
			resolveOptions: new HookMap(
				() => new SyncWaterfallHook(["resolveOptions"])
			),
			/** @type {HookMap<Resolver, Object>} */
			resolver: new HookMap(() => new SyncHook(["resolver", "resolveOptions"]))
		});
		/** @type {Map<string, ResolverCache>} */
		this.cache = new Map();
	}

	/**
	 * @param {string} type type of resolver
	 * @param {Object} resolveOptions options
	 * @returns {Resolver} the resolver
	 */
	get(type, resolveOptions) {
		let typedCaches = this.cache.get(type);
		if (!typedCaches) {
			typedCaches = {
				direct: new WeakMap(),
				stringified: new Map()
			};
			this.cache.set(type, typedCaches);
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
		const newResolver = this._create(type, resolveOptions);
		typedCaches.direct.set(resolveOptions, newResolver);
		typedCaches.stringified.set(ident, newResolver);
		return newResolver;
	}

	/**
	 * @param {string} type type of resolver
	 * @param {Object} resolveOptions options
	 * @returns {Resolver} the resolver
	 */
	_create(type, resolveOptions) {
		resolveOptions = this.hooks.resolveOptions.for(type).call(resolveOptions);
		const resolver = Factory.createResolver(resolveOptions);
		if (!resolver) {
			throw new Error("No resolver created");
		}
		this.hooks.resolver.for(type).call(resolver, resolveOptions);
		return resolver;
	}
};
