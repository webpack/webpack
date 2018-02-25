"use strict";

require("should");
const ProfilingPlugin = require("../lib/debug/ProfilingPlugin");

describe("Profiling Plugin", () => {
	it("should persist the passed outpath", () => {
		const plugin = new ProfilingPlugin({
			outputPath: "invest_in_doge_coin"
		});
		plugin.outputPath.should.equal("invest_in_doge_coin");
	});

	it("should handle no options", () => {
		const plugin = new ProfilingPlugin();
		plugin.outputPath.should.equal("events.json");
	});

	it("should handle when unable to require the inspector", done => {
		const profiler = new ProfilingPlugin.Profiler();

		profiler
			.startProfiling()
			.then(() => {
				done();
			})
			.catch(e => {
				done(e);
			});
	});

	it("should handle when unable to start a profiling session", done => {
		const profiler = new ProfilingPlugin.Profiler({
			Session() {
				throw new Error("Sean Larkin was here.");
			}
		});

		profiler
			.startProfiling()
			.then(() => {
				done();
			})
			.catch(e => {
				done(e);
			});
	});

	it("handles sending a profiling message when no session", done => {
		const profiler = new ProfilingPlugin.Profiler();

		profiler
			.sendCommand("randy", "is a puppers")
			.then(() => {
				done();
			})
			.catch(e => {
				done(e);
			});
	});

	it("handles destroying when no session", done => {
		const profiler = new ProfilingPlugin.Profiler();

		profiler
			.destroy()
			.then(() => {
				done();
			})
			.catch(e => {
				done(e);
			});
	});
});
