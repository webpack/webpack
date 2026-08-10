"use strict";

const lazyModule = require("../lib/util/lazyModule");

describe("lazyModule", () => {
	it("should load once and resolve to the module", async () => {
		let calls = 0;
		const get = lazyModule(() => {
			calls++;
			return { answer: 42 };
		});
		expect(calls).toBe(0);
		// both calls start before either resolves — one in-flight load is shared
		const firstPromise = get();
		const secondPromise = get();
		const first = await firstPromise;
		expect(first).toEqual({ answer: 42 });
		expect(await secondPromise).toBe(first);
		expect(await get()).toBe(first);
		expect(calls).toBe(1);
	});

	it("should pass a promise from the loader through", async () => {
		const get = lazyModule(() => Promise.resolve("ecma"));
		expect(await get()).toBe("ecma");
	});

	it("should reject when the loader throws", async () => {
		const get = lazyModule(() => {
			throw new Error("no such module");
		});
		expect(() => get()).toThrow("no such module");
	});

	describe("loaded", () => {
		it("should read the module back once an awaited call resolved it", async () => {
			let calls = 0;
			const get = lazyModule(() => {
				calls++;
				return "warm";
			});
			await get();
			expect(get.loaded()).toBe("warm");
			expect(get.loaded()).toBe("warm");
			expect(calls).toBe(1);
		});

		it("should throw when nothing preloaded it", () => {
			const get = lazyModule(() => "warm");
			expect(() => get.loaded()).toThrow(/was read before an awaited call/);
		});

		it("should throw while the load is still in flight", async () => {
			const get = lazyModule(() => Promise.resolve("warm"));
			const promise = get();
			expect(() => get.loaded()).toThrow(/was read before an awaited call/);
			await promise;
			expect(get.loaded()).toBe("warm");
		});
	});
});
