"use strict";

const Cache = require("../../lib/cache/Cache");
const CacheFacade = require("../../lib/cache/CacheFacade");

const { ItemCacheFacade } = CacheFacade;

/**
 * @typedef {object} TestCacheOptions
 * @property {Error=} getError error every get answers with
 * @property {Error=} storeError error every store answers with
 */

/**
 * @param {TestCacheOptions=} options failures to inject
 * @returns {{ cache: Cache, data: Map<string, unknown> }} a cache backed by a map
 */
const createCache = (options = {}) => {
	/** @type {Map<string, unknown>} */
	const data = new Map();
	const cache = new Cache();
	cache.hooks.get.tapAsync(
		"TestCache",
		(identifier, _etag, _gotHandlers, callback) => {
			if (options.getError) return callback(options.getError);
			callback(null, data.get(identifier));
		}
	);
	cache.hooks.store.tapAsync(
		"TestCache",
		(identifier, _etag, value, callback) => {
			if (options.storeError) return callback(options.storeError);
			data.set(identifier, value);
			callback();
		}
	);
	return { cache, data };
};

describe("CacheFacade", () => {
	describe("getPromise", () => {
		it("resolves the stored value", async () => {
			const { cache, data } = createCache();
			data.set("facade|id", "value");
			const facade = new CacheFacade(cache, "facade");
			await expect(facade.getPromise("id", null)).resolves.toBe("value");
		});

		it("rejects when the cache errors", async () => {
			const { cache } = createCache({ getError: new Error("get failed") });
			const facade = new CacheFacade(cache, "facade");
			await expect(facade.getPromise("id", null)).rejects.toThrow(
				"get failed"
			);
		});
	});

	describe("provide", () => {
		it("calls back with the cached value on a hit", (done) => {
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

		it("computes and stores the value on a miss", (done) => {
			const { cache, data } = createCache();
			const facade = new CacheFacade(cache, "facade");
			facade.provide(
				"id",
				null,
				(callback) => callback(null, "computed"),
				(err, result) => {
					expect(err).toBeNull();
					expect(result).toBe("computed");
					expect(data.get("facade|id")).toBe("computed");
					done();
				}
			);
		});

		it("passes on an error of the cache", (done) => {
			const { cache } = createCache({ getError: new Error("get failed") });
			const facade = new CacheFacade(cache, "facade");
			facade.provide(
				"id",
				null,
				(callback) => callback(null, "computed"),
				(err) => {
					expect(/** @type {Error} */ (err).message).toBe("get failed");
					done();
				}
			);
		});

		it("passes on an error of the computer", (done) => {
			const { cache, data } = createCache();
			const facade = new CacheFacade(cache, "facade");
			facade.provide(
				"id",
				null,
				(callback) => callback(new Error("compute failed")),
				(err) => {
					expect(/** @type {Error} */ (err).message).toBe("compute failed");
					expect(data.has("facade|id")).toBe(false);
					done();
				}
			);
		});

		it("passes on an error of the store", (done) => {
			const { cache } = createCache({
				storeError: new Error("store failed")
			});
			const facade = new CacheFacade(cache, "facade");
			facade.provide(
				"id",
				null,
				(callback) => callback(null, "computed"),
				(err) => {
					expect(/** @type {Error} */ (err).message).toBe("store failed");
					done();
				}
			);
		});
	});

	describe("providePromise", () => {
		it("returns a cached value without computing", async () => {
			const { cache, data } = createCache();
			data.set("facade|id", "cached");
			const facade = new CacheFacade(cache, "facade");
			const computer = jest.fn(() => "computed");
			await expect(facade.providePromise("id", null, computer)).resolves.toBe(
				"cached"
			);
			expect(computer).not.toHaveBeenCalled();
		});

		it("computes and stores the value on a miss", async () => {
			const { cache, data } = createCache();
			const facade = new CacheFacade(cache, "facade");
			await expect(
				facade.providePromise("id", null, async () => "computed")
			).resolves.toBe("computed");
			expect(data.get("facade|id")).toBe("computed");
		});
	});
});

describe("ItemCacheFacade", () => {
	it("rejects getPromise when the cache errors", async () => {
		const { cache } = createCache({ getError: new Error("get failed") });
		const item = new ItemCacheFacade(cache, "item", null);
		await expect(item.getPromise()).rejects.toThrow("get failed");
	});

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

	it("computes and stores the value in provide on a miss", (done) => {
		const { cache, data } = createCache();
		const item = new ItemCacheFacade(cache, "item", null);
		item.provide(
			(callback) => callback(null, "computed"),
			(err, result) => {
				expect(err).toBeNull();
				expect(result).toBe("computed");
				expect(data.get("item")).toBe("computed");
				done();
			}
		);
	});

	it("returns a cached value from providePromise without computing", async () => {
		const { cache, data } = createCache();
		data.set("item", "cached");
		const item = new ItemCacheFacade(cache, "item", null);
		const computer = jest.fn(() => "computed");
		await expect(item.providePromise(computer)).resolves.toBe("cached");
		expect(computer).not.toHaveBeenCalled();
	});

	it("computes and stores the value in providePromise on a miss", async () => {
		const { cache, data } = createCache();
		const item = new ItemCacheFacade(cache, "item", null);
		await expect(item.providePromise(async () => "computed")).resolves.toBe(
			"computed"
		);
		expect(data.get("item")).toBe("computed");
	});
});
