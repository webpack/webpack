"use strict";

const Cache = require("../lib/Cache");
const { ItemCacheFacade, MultiItemCache } = require("../lib/CacheFacade");

describe("MultiItemCache", () => {
	it("Throws when getting items from an empty Cache", () => {
		const multiItemCache = new MultiItemCache(generateItemCaches(0));
		expect(() => multiItemCache.get(_ => _())).toThrowError();
	});

	it("Returns the single ItemCacheFacade when passed an array of length 1", () => {
		const itemCaches = generateItemCaches(1);
		const multiItemCache = new MultiItemCache(itemCaches);
		expect(multiItemCache).toBe(itemCaches[0]);
	});

	it("Retrieves items from the underlying Cache when get is called", () => {
		const itemCaches = generateItemCaches(10);
		const multiItemCache = new MultiItemCache(itemCaches);
		const callback = (err, res) => {
			expect(err).toBeNull();
			expect(res).toBeInstanceOf(Object);
		};
		for (let i = 0; i < 10; ++i) {
			multiItemCache.get(callback);
		}
	});

	it("Can get() a large number of items without exhausting the stack", () => {
		const itemCaches = generateItemCaches(10000, () => undefined);
		const multiItemCache = new MultiItemCache(itemCaches);
		let callbacks = 0;
		const callback = (err, res) => {
			expect(err).toBeNull();
			expect(res).toBeUndefined();
			++callbacks;
		};
		multiItemCache.get(callback);
		expect(callbacks).toEqual(1);
	});

	function generateItemCaches(howMany, dataGenerator) {
		const ret = [];
		for (let i = 0; i < howMany; ++i) {
			const name = `ItemCache${i}`;
			const tag = `ItemTag${i}`;
			const dataGen =
				dataGenerator ||
				(() => {
					return { name: tag };
				});
			const cache = new Cache();
			cache.hooks.get.tapAsync(
				"DataReturner",
				(_identifier, _etag, _gotHandlers, callback) => {
					callback(undefined, dataGen());
				}
			);
			const itemCache = new ItemCacheFacade(cache, name, tag);
			ret[i] = itemCache;
		}
		return ret;
	}
});
