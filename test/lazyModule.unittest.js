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
		const first = await get();
		expect(first).toEqual({ answer: 42 });
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

	describe("sync", () => {
		it("should load once on first call", () => {
			let calls = 0;
			const get = lazyModule.sync(() => {
				calls++;
				return { answer: 42 };
			});
			expect(calls).toBe(0);
			const first = get();
			expect(first).toEqual({ answer: 42 });
			expect(get()).toBe(first);
			expect(calls).toBe(1);
		});

		it("should load in preload and read synchronously afterwards", async () => {
			let calls = 0;
			const get = lazyModule.sync(() => {
				calls++;
				return "warm";
			});
			const promise = get.preload();
			// the load is deferred to the microtask, as `import()` would be
			expect(calls).toBe(0);
			expect(await promise).toBe("warm");
			expect(calls).toBe(1);
			expect(get()).toBe("warm");
			expect(calls).toBe(1);
		});

		it("should resolve preload from the cache once loaded", async () => {
			let calls = 0;
			const get = lazyModule.sync(() => {
				calls++;
				return "warm";
			});
			expect(get()).toBe("warm");
			expect(await get.preload()).toBe("warm");
			expect(calls).toBe(1);
		});

		it("should reject preload when the loader throws", async () => {
			const get = lazyModule.sync(() => {
				throw new Error("no such module");
			});
			await expect(get.preload()).rejects.toThrow("no such module");
		});
	});
});
