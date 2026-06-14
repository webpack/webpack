"use strict";

const webpack = require("../");

describe("defineConfig", () => {
	it("should be exported from webpack", () => {
		expect(typeof webpack.defineConfig).toBe("function");
	});

	it("should return an object configuration unchanged", () => {
		/** @type {import("../").Configuration} */
		const config = { mode: "production" };

		expect(webpack.defineConfig(config)).toBe(config);
	});

	it("should return a multi compiler configuration unchanged", () => {
		/** @type {import("../").MultiConfiguration} */
		const config = [{ name: "a" }, { name: "b" }];

		expect(webpack.defineConfig(config)).toBe(config);
	});

	it("should return a function style configuration unchanged", () => {
		/** @type {import("../").ConfigurationFactory} */
		const fn = (env) => ({
			mode: env.production ? "production" : "development"
		});

		expect(webpack.defineConfig(fn)).toBe(fn);
	});

	it("should return a function style multi compiler configuration unchanged", () => {
		/** @type {import("../").ConfigurationFactory} */
		const fn = () => [{ name: "a" }, { name: "b" }];

		expect(webpack.defineConfig(fn)).toBe(fn);
	});

	it("should return an async function style configuration unchanged", () => {
		/** @type {import("../").ConfigurationFactory} */
		const fn = async () => ({ mode: "none" });

		expect(webpack.defineConfig(fn)).toBe(fn);
	});

	it("should return an async function style multi compiler configuration unchanged", () => {
		/** @type {import("../").ConfigurationFactory} */
		const fn = async () => [{ name: "a" }, { name: "b" }];

		expect(webpack.defineConfig(fn)).toBe(fn);
	});

	it("should return an array of function style configurations unchanged", () => {
		/** @type {import("../").ConfigurationFactory[]} */
		const fns = [() => ({ name: "a" }), async () => ({ name: "b" })];

		expect(webpack.defineConfig(fns)).toBe(fns);
	});

	it("should return a promise configuration unchanged", () => {
		/** @type {Promise<import("../").Configuration>} */
		const promise = Promise.resolve({ mode: "none" });

		expect(webpack.defineConfig(promise)).toBe(promise);
	});

	it("should return a promise multi compiler configuration unchanged", () => {
		/** @type {Promise<import("../").MultiConfiguration>} */
		const promise = Promise.resolve([{ name: "a" }, { name: "b" }]);

		expect(webpack.defineConfig(promise)).toBe(promise);
	});

	it("should return a promise function style configuration unchanged", () => {
		/** @type {Promise<import("../").ConfigurationFactory>} */
		const promise = Promise.resolve(() => ({ mode: "none" }));

		expect(webpack.defineConfig(promise)).toBe(promise);
	});

	it("should return a promise async function style configuration unchanged", () => {
		/** @type {Promise<import("../").ConfigurationFactory>} */
		const promise = Promise.resolve(async () => ({ mode: "none" }));

		expect(webpack.defineConfig(promise)).toBe(promise);
	});

	it("should return a promise array of function style configurations unchanged", () => {
		/** @type {Promise<import("../").ConfigurationFactory[]>} */
		const promise = Promise.resolve([
			() => ({ name: "a" }),
			async () => ({ name: "b" })
		]);

		expect(webpack.defineConfig(promise)).toBe(promise);
	});
});
