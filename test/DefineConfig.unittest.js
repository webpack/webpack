"use strict";

const webpack = require("../");
const defineConfig = require("../lib/config/defineConfig");

describe("defineConfig", () => {
	it("should be exported from webpack", () => {
		expect(webpack.defineConfig).toBe(defineConfig);
	});

	it("should return an object configuration unchanged", () => {
		const config = defineConfig({ mode: "production" });

		expect(config).toEqual({ mode: "production" });
	});

	it("should return an array configuration unchanged", () => {
		const config = [{ name: "a" }, { name: "b" }];

		expect(defineConfig(config)).toBe(config);
	});

	it("should return a function style configuration unchanged", () => {
		/** @type {import("../lib/config/defineConfig").ConfigurationFactory} */
		const fn = (env) => ({
			mode: env.production ? "production" : "development"
		});

		expect(defineConfig(fn)).toBe(fn);
	});

	it("should return an async function style configuration unchanged", () => {
		/** @type {import("../lib/config/defineConfig").ConfigurationFactory} */
		const fn = async () => ({ mode: "none" });

		expect(defineConfig(fn)).toBe(fn);
	});

	it("should return a promise configuration unchanged", () => {
		/** @type {Promise<import("../lib/config/defineConfig").Configuration>} */
		const promise = Promise.resolve({ mode: "none" });

		expect(defineConfig(promise)).toBe(promise);
	});
});
