"use strict";

const CachePlugin = require("../lib/CachePlugin");

describe("CachePlugin", () => {
	let env;

	beforeEach(() => {
		env = {
			compilation: {
				compiler: {},
				warnings: []
			}
		};
	});

	describe("applyMtime", () => {
		beforeEach(() => (env.plugin = new CachePlugin()));

		it("sets file system accuracy to 1 for granular modification timestamp", () => {
			env.plugin.applyMtime(1483819067001);
			expect(env.plugin.FS_ACCURACY).toBe(1);
		});

		it("sets file system accuracy to 10 for moderately granular modification timestamp", () => {
			env.plugin.applyMtime(1483819067004);
			expect(env.plugin.FS_ACCURACY).toBe(10);
		});

		it("sets file system accuracy to 100 for moderately coarse modification timestamp", () => {
			env.plugin.applyMtime(1483819067040);
			expect(env.plugin.FS_ACCURACY).toBe(100);
		});

		it("sets file system accuracy to 1000 for coarse modification timestamp", () => {
			env.plugin.applyMtime(1483819067400);
			expect(env.plugin.FS_ACCURACY).toBe(1000);
		});
	});
});
