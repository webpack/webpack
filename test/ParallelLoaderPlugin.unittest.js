"use strict";

describe("ParallelLoaderPlugin", () => {
	it("should throw when worker_threads is unavailable", () => {
		jest.isolateModules(() => {
			jest.doMock("worker_threads", () => {
				throw new Error("Cannot find module 'worker_threads'");
			});

			const ParallelLoaderPlugin = require("../lib/loaders/ParallelLoaderPlugin");

			expect(() => {
				new ParallelLoaderPlugin({}).apply(
					/** @type {EXPECTED_ANY} */ ({ hooks: {}, root: {} })
				);
			}).toThrow(/requires the 'worker_threads' module/);
		});
	});
});
