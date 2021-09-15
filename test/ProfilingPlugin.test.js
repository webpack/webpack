"use strict";

require("./helpers/warmup-webpack");

const path = require("path");
const fs = require("graceful-fs");
const rimraf = require("rimraf");

describe("Profiling Plugin", function () {
	jest.setTimeout(120000);

	it("should handle output path with folder creation", done => {
		const webpack = require("../");
		const outputPath = path.join(__dirname, "js/profilingPath");
		const finalPath = path.join(outputPath, "events.json");
		rimraf(outputPath, () => {
			const startTime = process.hrtime();
			const compiler = webpack({
				context: __dirname,
				entry: "./fixtures/a.js",
				output: {
					path: path.join(__dirname, "js/profilingOut")
				},
				plugins: [
					new webpack.debug.ProfilingPlugin({
						outputPath: finalPath
					})
				]
			});
			compiler.run(err => {
				if (err) return done(err);
				const testDuration = process.hrtime(startTime);
				if (!fs.existsSync(outputPath))
					return done(new Error("Folder should be created."));
				const data = require(finalPath);
				const maxTs = data.reduce((max, entry) => Math.max(max, entry.ts), 0);
				const minTs = data[0].ts;
				const duration = maxTs - minTs;
				expect(duration).toBeLessThan(
					testDuration[0] * 1000000 + testDuration[1] / 1000
				);
				const cpuProfile = data.find(entry => entry.name === "CpuProfile");
				expect(cpuProfile).toBeTypeOf("object");
				const profile = cpuProfile.args.data.cpuProfile;
				expect(profile.startTime).toBeGreaterThanOrEqual(minTs);
				expect(profile.endTime).toBeLessThanOrEqual(maxTs);
				done();
			});
		});
	});
});
