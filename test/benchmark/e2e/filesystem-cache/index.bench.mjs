import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { generateModuleTree } from "../../helpers/project.mjs";
import { prepareConfig, runBuild } from "../../lib/webpack.mjs";

const caseDir = path.dirname(fileURLToPath(import.meta.url));
const generated = path.join(caseDir, "generated");
const entry = path.join(generated, "module-0.js");

/**
 * @param {string} name benchmark name
 * @param {"development" | "production"} mode mode
 * @param {false | "gzip" | "brotli"} compression cache compression
 * @returns {{ write: import("../../../..").Configuration, read: import("../../../..").Configuration, cacheDirectory: string }} cache configurations
 */
const cacheConfigs = (name, mode, compression) => {
	const write = prepareConfig(caseDir, name, {
		mode,
		entry,
		cache: {
			type: "filesystem",
			compression,
			maxMemoryGenerations: 0,
			idleTimeoutForInitialStore: 0
		}
	});
	const fileCache =
		/** @type {import("../../../..").FileCacheOptions} */ (write.cache);
	return {
		write,
		read: {
			...write,
			cache: {
				...fileCache,
				readonly: true
			}
		},
		cacheDirectory: /** @type {string} */ (fileCache.cacheDirectory)
	};
};

/**
 * @param {string} name benchmark name
 * @param {"development" | "production"} mode mode
 * @param {false | "gzip" | "brotli"} compression cache compression
 * @returns {import("../../lib/suite.mjs").BenchmarkDefinition} benchmark
 */
const warmCacheBench = (name, mode, compression) => {
	const config = cacheConfigs(name, mode, compression);
	return {
		name,
		async beforeAll() {
			await fs.rm(config.cacheDirectory, {
				recursive: true,
				force: true
			});
			await runBuild(config.write);
		},
		fn() {
			return runBuild(config.read);
		}
	};
};

const coldConfig = cacheConfigs("cold-development", "development", false);

export default {
	name: "e2e/filesystem-cache",
	async setup() {
		await generateModuleTree({
			dir: generated,
			count: 300,
			format: "esm"
		});
	},
	benches: [
		warmCacheBench(
			"warm development filesystem cache",
			"development",
			false
		),
		warmCacheBench("warm production filesystem cache", "production", false),
		warmCacheBench(
			"warm development gzip filesystem cache",
			"development",
			"gzip"
		),
		warmCacheBench(
			"warm development brotli filesystem cache",
			"development",
			"brotli"
		),
		{
			name: "cold development filesystem cache",
			beforeEach() {
				return fs.rm(coldConfig.cacheDirectory, {
					recursive: true,
					force: true
				});
			},
			fn() {
				return runBuild(coldConfig.write);
			}
		}
	]
};
