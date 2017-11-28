/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
"use strict";

const Tapable = require("tapable");
const Factory = require("enhanced-resolve").ResolverFactory;

module.exports = class ResolverFactory extends Tapable {
	constructor() {
		super();
		this.cache1 = new WeakMap();
		this.cache2 = new Map();
	}

	get(type, resolveOptions) {
		const cachedResolver = this.cache1.get(resolveOptions);
		if(cachedResolver) return cachedResolver();
		const ident = `${type}|${JSON.stringify(resolveOptions)}`;
		const resolver = this.cache2.get(ident);
		if(resolver) return resolver;
		const newResolver = this._create(type, resolveOptions);
		this.cache2.set(ident, newResolver);
		return newResolver;
	}

	_create(type, resolveOptions) {
		resolveOptions = this.applyPluginsWaterfall(`resolve-options ${type}`, resolveOptions);
		const resolver = Factory.createResolver(resolveOptions);
		if(!resolver) {
			throw new Error("No resolver created");
		}
		this.applyPlugins2(`resolver ${type}`, resolver, resolveOptions);
		return resolver;
	}
};
