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
				snapshot: {
					immutablePaths: [url],
					managedPaths: [url],
					unmanagedPaths: [url]
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
			expect(options.snapshot.immutablePaths).toEqual([directory]);
			expect(options.snapshot.managedPaths).toEqual([directory]);
			expect(options.snapshot.unmanagedPaths).toEqual([directory]);
		});

		it("leaves a plain path and a regular expression alone", () => {
			const expression = /node_modules/;
			const options = getNormalizedWebpackOptions({
				context: directory,
				recordsPath: false,
				snapshot: { managedPaths: [directory, expression] }
			});

			expect(options.context).toBe(directory);
			expect(options.recordsInputPath).toBe(false);
			expect(options.snapshot.managedPaths).toEqual([directory, expression]);
		});

		it("converts file URLs in dotenv.dir, buildHttp paths, module.noParse and resolve.restrictions", () => {
			const expression = /node_modules/;
			const options = getNormalizedWebpackOptions({
				dotenv: { dir: url },
				experiments: {
					buildHttp: {
						allowedUris: ["https://example.com"],
						cacheLocation: url,
						lockfileLocation: url
					}
				},
				module: { noParse: url },
				resolve: { restrictions: [url, expression] }
			});

			expect(options.dotenv.dir).toBe(directory);
			expect(options.experiments.buildHttp).toMatchObject({
				cacheLocation: directory,
				lockfileLocation: directory
			});
			expect(options.module.noParse).toBe(directory);
			expect(options.resolve.restrictions).toEqual([directory, expression]);
		});

		it("converts file URLs inside a module.noParse array", () => {
			const expression = /vendor/;
			const options = getNormalizedWebpackOptions({
				module: { noParse: [url, expression] }
			});

			expect(options.module.noParse).toEqual([directory, expression]);
		});
	});
});
