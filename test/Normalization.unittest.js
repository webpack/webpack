"use strict";

const path = require("path");
const { pathToFileURL } = require("url");
const { getNormalizedWebpackOptions } = require("../lib/config/normalization");

describe("getNormalizedWebpackOptions", () => {
	describe("file URLs", () => {
		const directory = path.resolve("/dir");
		const url = pathToFileURL(directory).href;

		it("converts the options that take an absolute path", () => {
			const options = getNormalizedWebpackOptions({
				context: url,
				output: { path: url },
				recordsPath: url,
				cache: {
					type: "filesystem",
					cacheDirectory: url,
					cacheLocation: url
				},
				dotenv: {
					dir: url
				},
				experiments: {
					buildHttp: {
						cacheLocation: url,
						lockfileLocation: url
					}
				},
				module: {
					noParse: url
				},
				resolve: {
					restrictions: [url]
				},
				resolveLoader: {
					restrictions: [url]
				},
				snapshot: {
					immutablePaths: [url],
					managedPaths: [url],
					unmanagedPaths: [url]
				},
				stats: {
					context: url
				}
			});

			expect(options.context).toBe(directory);
			expect(options.output.path).toBe(directory);
			expect(options.recordsInputPath).toBe(directory);
			expect(options.recordsOutputPath).toBe(directory);
			expect(options.cache).toMatchObject({
				type: "filesystem",
				cacheDirectory: directory,
				cacheLocation: directory
			});
			expect(options.dotenv).toMatchObject({
				dir: directory
			});
			expect(options.experiments.buildHttp).toMatchObject({
				cacheLocation: directory,
				lockfileLocation: directory
			});
			expect(options.module.noParse).toBe(directory);
			expect(options.resolve.restrictions).toEqual([directory]);
			expect(options.resolveLoader.restrictions).toEqual([directory]);
			expect(options.snapshot.immutablePaths).toEqual([directory]);
			expect(options.snapshot.managedPaths).toEqual([directory]);
			expect(options.snapshot.unmanagedPaths).toEqual([directory]);
			expect(options.stats.context).toBe(directory);
		});

		it("leaves a plain path and a regular expression alone", () => {
			const expression = /node_modules/;
			const options = getNormalizedWebpackOptions({
				context: directory,
				recordsPath: false,
				dotenv: { dir: directory },
				experiments: {
					buildHttp: {
						cacheLocation: directory,
						lockfileLocation: directory
					}
				},
				module: {
					noParse: [directory, expression]
				},
				resolve: {
					restrictions: [directory, expression]
				},
				resolveLoader: {
					restrictions: [directory, expression]
				},
				snapshot: { managedPaths: [directory, expression] },
				stats: { context: directory }
			});

			expect(options.context).toBe(directory);
			expect(options.recordsInputPath).toBe(false);
			expect(options.dotenv).toMatchObject({ dir: directory });
			expect(options.experiments.buildHttp).toMatchObject({
				cacheLocation: directory,
				lockfileLocation: directory
			});
			expect(options.module.noParse).toEqual([directory, expression]);
			expect(options.resolve.restrictions).toEqual([directory, expression]);
			expect(options.resolveLoader.restrictions).toEqual([
				directory,
				expression
			]);
			expect(options.snapshot.managedPaths).toEqual([directory, expression]);
			expect(options.stats.context).toBe(directory);
		});
	});
});
