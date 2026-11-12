"use strict";

const path = require("path");
const { pathToFileURL } = require("url");
const { getNormalizedWebpackOptions } = require("../../lib/config/normalization");

describe("getNormalizedWebpackOptions", () => {
	describe("incremental", () => {
		it.each([true, false])("normalizes %s to stage options", (enabled) => {
			expect(
				getNormalizedWebpackOptions({ incremental: enabled }).incremental
			).toEqual({ buildModuleGraph: enabled });
		});

		it("leaves omitted stages for defaults and clones the options", () => {
			const incremental = { buildModuleGraph: false };
			const normalized = getNormalizedWebpackOptions({ incremental });
			expect(normalized.incremental).toEqual(incremental);
			expect(normalized.incremental).not.toBe(incremental);
			expect(getNormalizedWebpackOptions({}).incremental).toEqual({});
			expect(
				getNormalizedWebpackOptions({ incremental: {} }).incremental
			).toEqual({});
		});
	});

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
	});
});
