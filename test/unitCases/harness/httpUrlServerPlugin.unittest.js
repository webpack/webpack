"use strict";

const { AsyncSeriesHook, SyncHook } = require("tapable");
const ServerPlugin = require("../../configCases/asset-modules/http-url/server");

/**
 * @returns {import("../../../").Compiler} the hooks `ServerPlugin` taps
 */
const createCompiler = () =>
	/** @type {import("../../../").Compiler} */ (
		/** @type {unknown} */ ({
			hooks: {
				beforeRun: new AsyncSeriesHook(["compiler"]),
				done: new AsyncSeriesHook(["stats"]),
				failed: new SyncHook(["error"])
			}
		})
	);

describe("http-url ServerPlugin", () => {
	it("keeps serving while another compiler holds it after one fails late", async () => {
		// port 0 takes a free port, so no other test using the case's port is hit
		const plugin = new ServerPlugin(0);
		const first = createCompiler();
		const second = createCompiler();
		plugin.apply(first);
		plugin.apply(second);
		await first.hooks.beforeRun.promise(first);
		await second.hooks.beforeRun.promise(second);

		// a `done` tap after the plugin's throws, so `failed` follows `done`
		await first.hooks.done.promise(
			/** @type {import("../../../").Stats} */ ({})
		);
		first.hooks.failed.call(new Error("a later done tap threw"));
		expect(plugin.refs).toBe(1);
		expect(plugin.server && plugin.server.listening).toBe(true);

		await second.hooks.done.promise(
			/** @type {import("../../../").Stats} */ ({})
		);
		expect(plugin.refs).toBe(0);
		expect(plugin.server).toBeUndefined();
	});
});
