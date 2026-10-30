"use strict";

const Cache = require("../../lib/cache/Cache");
const CacheFacade = require("../../lib/cache/CacheFacade");

const { ItemCacheFacade } = CacheFacade;

/**
 * @returns {{ cache: Cache, data: Map<string, unknown> }} a cache backed by a map
 */
const createCache = () => {
	/** @type {Map<string, unknown>} */
	const data = new Map();
	const cache = new Cache();
	cache.hooks.get.tapAsync(
		"TestCache",
		(identifier, _etag, _gotHandlers, callback) => {
			callback(null, data.get(identifier));
		}
	);
	cache.hooks.store.tapAsync(
		"TestCache",
		(identifier, _etag, value, callback) => {
			data.set(identifier, value);
			callback();
		}
	);
	return { cache, data };
};

describe("CacheFacade", () => {
	it("calls back with the cached value from provide on a hit", (done) => {
		const { cache, data } = createCache();
		data.set("facade|id", "cached");
		const facade = new CacheFacade(cache, "facade");
		const computer = jest.fn();
		facade.provide("id", null, computer, (err, result) => {
			expect(err).toBeNull();
			expect(result).toBe("cached");
			expect(computer).not.toHaveBeenCalled();
			done();
		});
	});
});

describe("ItemCacheFacade", () => {
	it("calls back with the cached value from provide on a hit", (done) => {
		const { cache, data } = createCache();
		data.set("item", "cached");
		const item = new ItemCacheFacade(cache, "item", null);
		const computer = jest.fn();
		item.provide(computer, (err, result) => {
			expect(err).toBeNull();
			expect(result).toBe("cached");
			expect(computer).not.toHaveBeenCalled();
			done();
		});
	});
});
