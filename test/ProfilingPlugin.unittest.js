"use strict";

const ProfilingPlugin = require("../lib/debug/ProfilingPlugin");

describe("Profiling Plugin", () => {
	it("should persist the passed outpath", () => {
		const plugin = new ProfilingPlugin({
			outputPath: "invest_in_doge_coin"
		});
		expect(plugin.outputPath).toBe("invest_in_doge_coin");
	});

	it("should handle no options", () => {
		const plugin = new ProfilingPlugin();
		expect(plugin.outputPath).toBe("events.json");
	});

	it("should handle when unable to require the inspector", () => {
		const profiler = new ProfilingPlugin.Profiler();
		return profiler.startProfiling();
	});

	it("should handle when unable to start a profiling session", () => {
		const profiler = new ProfilingPlugin.Profiler({
			Session() {
				throw new Error("Sean Larkin was here.");
			}
		});

		return profiler.startProfiling();
	});

	it("handles sending a profiling message when no session", () => {
		const profiler = new ProfilingPlugin.Profiler();
		return profiler.sendCommand("randy", "is a puppers");
	});

	it("handles destroying when no session", () => {
		const profiler = new ProfilingPlugin.Profiler();
		return profiler.destroy();
	});
});
