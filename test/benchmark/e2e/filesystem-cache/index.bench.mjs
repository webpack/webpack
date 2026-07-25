import fs from "fs/promises";
import os from "os";
import path from "path";
import { generateModuleTree } from "../../helpers/project.mjs";
import { prepareConfig, runBuild } from "../../lib/webpack.mjs";

const caseDir = import.meta.dirname;
const generated = path.join(caseDir, "generated");
const entry = path.join(generated, "module-0.js");
const name = "e2e/filesystem-cache";

const createOutputPath = () =>
	fs.mkdtemp(path.join(os.tmpdir(), "webpack-benchmark-"));

/**
 * @param {string} outputPath temporary output directory
 * @param {string} benchName benchmark name
 * @param {"development" | "production"} mode mode
 * @param {false | "gzip" | "brotli"} compression cache compression
 * @returns {{ write: import("../../../..").Configuration, read: import("../../../..").Configuration, cacheDirectory: string }} cache configurations
 */
const cacheConfigs = (outputPath, benchName, mode, compression) => {
	const write = prepareConfig(outputPath, benchName, {
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
 * @param {string} caseName benchmark case
 * @param {"development" | "production"} mode mode
 * @param {false | "gzip" | "brotli"} compression cache compression
 * @returns {{ name: string, beforeAll: () => Promise<void>, fn: () => Promise<void>, afterAll: () => Promise<void> }} benchmark
 */
const warmCacheBench = (caseName, mode, compression) => {
	const benchName = `${caseName}/${mode}-build`;
	/** @type {ReturnType<typeof cacheConfigs> | undefined} */
	let config;
	/** @type {string | undefined} */
	let outputPath;
	return {
		name: benchName,
		async beforeAll() {
			outputPath = await createOutputPath();
			config = cacheConfigs(outputPath, benchName, mode, compression);
			try {
				await runBuild(config.write);
			} catch (error) {
				await fs.rm(outputPath, { recursive: true, force: true });
				outputPath = undefined;
				config = undefined;
				throw error;
			}
		},
		fn() {
			if (config === undefined) {
				throw new Error("Cache benchmark is not initialized");
			}
			return runBuild(config.read);
		},
		async afterAll() {
			config = undefined;
			if (outputPath === undefined) return;
			const currentOutputPath = outputPath;
			outputPath = undefined;
			await fs.rm(currentOutputPath, { recursive: true, force: true });
		}
	};
};

const coldCacheBench = () => {
	const benchName = "cold/development-build";
	/** @type {ReturnType<typeof cacheConfigs> | undefined} */
	let config;
	/** @type {string | undefined} */
	let outputPath;
	return {
		name: benchName,
		async beforeAll() {
			outputPath = await createOutputPath();
			config = cacheConfigs(outputPath, benchName, "development", false);
		},
		beforeEach() {
			if (config === undefined) {
				throw new Error("Cache benchmark is not initialized");
			}
			return fs.rm(config.cacheDirectory, {
				recursive: true,
				force: true
			});
		},
		fn() {
			if (config === undefined) {
				throw new Error("Cache benchmark is not initialized");
			}
			return runBuild(config.write);
		},
		async afterAll() {
			config = undefined;
			if (outputPath === undefined) return;
			const currentOutputPath = outputPath;
			outputPath = undefined;
			await fs.rm(currentOutputPath, { recursive: true, force: true });
		}
	};
};

export default {
	name,
	async setup() {
		await generateModuleTree({
			dir: generated,
			count: 300,
			format: "esm"
		});
	},
	benches: [
		warmCacheBench("warm", "development", false),
		warmCacheBench("warm", "production", false),
		warmCacheBench("warm-gzip", "development", "gzip"),
		warmCacheBench("warm-brotli", "development", "brotli"),
		coldCacheBench()
	]
};
