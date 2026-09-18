"use strict";

const webpack = require("../..");

describe("DefinePlugin.runtimeValue", () => {
	it("should detect async generator functions", () => {
		expect(
			webpack.DefinePlugin.runtimeValue(async () => true).isAsync
		).toBe(true);
		expect(
			webpack.DefinePlugin.runtimeValue(() => {
				return true;
			}).isAsync
		).toBe(false);
	});

	it("should reject a sync generator that returns a Promise", () => {
		const runtimeValue = webpack.DefinePlugin.runtimeValue(
			() => Promise.resolve("value"),
			[]
		);
		expect(() =>
			runtimeValue.exec(
				/** @type {EXPECTED_ANY} */ ({ state: { module: { buildInfo: {} } } }),
				new Map(),
				"SYNC_PROMISE"
			)
		).toThrow("not an async function");
	});

	it("should not resolve async generator values when no compile ran", () => {
		const runtimeValue = webpack.DefinePlugin.runtimeValue(
			async () => "value",
			[]
		);
		// a parser without a compilation, and a compilation without resolved
		// values, both report the value as not resolved
		for (const state of [
			{ module: { buildInfo: {} } },
			{
				module: { buildInfo: {} },
				compilation: Object.create(null)
			}
		]) {
			expect(() =>
				runtimeValue.exec(
					/** @type {EXPECTED_ANY} */ ({ state }),
					new Map(),
					"ASYNC_VALUE"
				)
			).toThrow("was not resolved before parsing");
		}
	});
});