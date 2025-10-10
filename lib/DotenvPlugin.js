/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const FileSystemInfo = require("./FileSystemInfo");
const createSchemaValidation = require("./util/create-schema-validation");
const { join } = require("./util/fs");

/** @typedef {import("../declarations/WebpackOptions").DotenvPluginOptions} DotenvPluginOptions */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./CacheFacade")} CacheFacade */
/** @typedef {import("./util/fs").InputFileSystem} InputFileSystem */
/** @typedef {import("./FileSystemInfo").Snapshot} Snapshot */

/** @type {DotenvPluginOptions} */
const DEFAULT_OPTIONS = {
	prefix: "WEBPACK_",
	template: [".env", ".env.local", ".env.[mode]", ".env.[mode].local"]
};

// Regex for parsing .env files
// ported from https://github.com/motdotla/dotenv/blob/master/lib/main.js#L32
const LINE =
	/(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/gm;

const PLUGIN_NAME = "DotenvPlugin";

const validate = createSchemaValidation(
	undefined,
	() => {
		const { definitions } = require("../schemas/WebpackOptions.json");

		return {
			definitions,
			oneOf: [{ $ref: "#/definitions/DotenvPluginOptions" }]
		};
	},
	{
		name: "Dotenv Plugin",
		baseDataPath: "options"
	}
);

/**
 * Parse .env file content
 * ported from https://github.com/motdotla/dotenv/blob/master/lib/main.js#L49
 * @param {string|Buffer} src the source content to parse
 * @returns {Record<string, string>} parsed environment variables object
 */
function parse(src) {
	const obj = /** @type {Record<string, string>} */ ({});

	// Convert buffer to string
	let lines = src.toString();

	// Convert line breaks to same format
	lines = lines.replace(/\r\n?/gm, "\n");

	let match;
	while ((match = LINE.exec(lines)) !== null) {
		const key = match[1];

		// Default undefined or null to empty string
		let value = match[2] || "";

		// Remove whitespace
		value = value.trim();

		// Check if double quoted
		const maybeQuote = value[0];

		// Remove surrounding quotes
		value = value.replace(/^(['"`])([\s\S]*)\1$/gm, "$2");

		// Expand newlines if double quoted
		if (maybeQuote === '"') {
			value = value.replace(/\\n/g, "\n");
			value = value.replace(/\\r/g, "\r");
		}

		// Add to object
		obj[key] = value;
	}

	return obj;
}

/**
 * Resolve escape sequences
 * ported from https://github.com/motdotla/dotenv-expand
 * @param {string} value value to resolve
 * @returns {string} resolved value
 */
function _resolveEscapeSequences(value) {
	return value.replace(/\\\$/g, "$");
}

/**
 * Expand environment variable value
 * ported from https://github.com/motdotla/dotenv-expand
 * @param {string} value value to expand
 * @param {Record<string, string | undefined>} processEnv process.env object
 * @param {Record<string, string>} runningParsed running parsed object
 * @returns {string} expanded value
 */
function expandValue(value, processEnv, runningParsed) {
	const env = { ...runningParsed, ...processEnv }; // process.env wins

	const regex = /(?<!\\)\$\{([^{}]+)\}|(?<!\\)\$([A-Za-z_][A-Za-z0-9_]*)/g;

	let result = value;
	let match;
	const seen = new Set(); // self-referential checker

	while ((match = regex.exec(result)) !== null) {
		seen.add(result);

		const [template, bracedExpression, unbracedExpression] = match;
		const expression = bracedExpression || unbracedExpression;

		// match the operators `:+`, `+`, `:-`, and `-`
		const opRegex = /(:\+|\+|:-|-)/;
		// find first match
		const opMatch = expression.match(opRegex);
		const splitter = opMatch ? opMatch[0] : null;

		const r = expression.split(/** @type {string} */ (splitter));
		// const r = splitter ? expression.split(splitter) : [expression];

		let defaultValue;
		let value;

		const key = r.shift();

		if ([":+", "+"].includes(splitter || "")) {
			defaultValue = env[key || ""] ? r.join(splitter || "") : "";
			value = null;
		} else {
			defaultValue = r.join(splitter || "");
			value = env[key || ""];
		}

		if (value) {
			// self-referential check
			result = seen.has(value)
				? result.replace(template, defaultValue)
				: result.replace(template, value);
		} else {
			result = result.replace(template, defaultValue);
		}

		// if the result equaled what was in process.env and runningParsed then stop expanding
		if (result === runningParsed[key || ""]) {
			break;
		}

		regex.lastIndex = 0; // reset regex search position to re-evaluate after each replacement
	}

	return result;
}

/**
 * Expand environment variables in parsed object
 * ported from https://github.com/motdotla/dotenv-expand
 * @param {{ parsed: Record<string, string>, processEnv: Record<string, string | undefined> }} options expand options
 * @returns {{ parsed: Record<string, string> }} expanded options
 */
function expand(options) {
	// for use with progressive expansion
	const runningParsed = /** @type {Record<string, string>} */ ({});
	const processEnv = options.processEnv;

	// dotenv.config() ran before this so the assumption is process.env has already been set
	for (const key in options.parsed) {
		let value = options.parsed[key];

		// short-circuit scenario: process.env was already set prior to the file value
		value =
			processEnv[key] && processEnv[key] !== value
				? /** @type {string} */ (processEnv[key])
				: expandValue(value, processEnv, runningParsed);

		const resolvedValue = _resolveEscapeSequences(value);

		options.parsed[key] = resolvedValue;
		// for use with progressive expansion
		runningParsed[key] = resolvedValue;
	}

	// Part of `dotenv-expand` code, but we don't need it because of we don't modify `process.env`
	// for (const processKey in options.parsed) {
	// 	if (processEnv) {
	// 		processEnv[processKey] = options.parsed[processKey];
	// 	}
	// }

	return options;
}

/**
 * Format environment variables as DefinePlugin definitions
 * @param {Record<string, string>} env environment variables
 * @returns {Record<string, string>} formatted definitions
 */
const envToDefinitions = (env) => {
	const definitions = /** @type {Record<string, string>} */ ({});

	for (const [key, value] of Object.entries(env)) {
		// Always use process.env. prefix for DefinePlugin
		definitions[`process.env.${key}`] = JSON.stringify(value);
	}

	return definitions;
};

class DotenvPlugin {
	/**
	 * @param {DotenvPluginOptions=} options options object
	 */
	constructor(options = {}) {
		validate(options);
		const prefix = Array.isArray(options.prefix)
			? options.prefix
			: [options.prefix || "WEBPACK_"];
		this.options = {
			...DEFAULT_OPTIONS,
			...options,
			prefix
		};
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const definePlugin = new compiler.webpack.DefinePlugin({});
		const fs = /** @type {InputFileSystem} */ (compiler.inputFileSystem);
		const fileSystemInfo = new FileSystemInfo(fs, {
			unmanagedPaths: compiler.unmanagedPaths,
			managedPaths: compiler.managedPaths,
			immutablePaths: compiler.immutablePaths,
			hashFunction: compiler.options.output.hashFunction
		});
		const cache = compiler.getCache(PLUGIN_NAME);

		/** @type {undefined | Snapshot} */
		let snapshot;

		compiler.hooks.beforeCompile.tapPromise(PLUGIN_NAME, async () => {
			const { env, snapshot: newSnapshot } = await this._loadEnv(
				compiler,
				cache,
				fileSystemInfo
			);

			// update the definitions
			definePlugin.definitions = envToDefinitions(env || {});
			// update the file dependencies
			snapshot = newSnapshot;
		});

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			if (snapshot) {
				compilation.fileDependencies.addAll(snapshot.getFileIterable());
				compilation.missingDependencies.addAll(snapshot.getMissingIterable());
			}
		});

		definePlugin.apply(compiler);
	}

	/**
	 * Get list of env files to load based on mode and template
	 * Similar to Vite's getEnvFilesForMode
	 * @private
	 * @param {InputFileSystem} inputFileSystem the input file system
	 * @param {string} dir the directory containing .env files
	 * @param {string | undefined} mode the mode (e.g., 'production', 'development')
	 * @returns {string[]} array of file paths to load
	 */
	_getEnvFilesForMode(inputFileSystem, dir, mode) {
		if (!dir) {
			return [];
		}

		const { template } = /** @type {DotenvPluginOptions} */ (this.options);
		const templates = template || [];

		return templates
			.map((pattern) => pattern.replace(/\[mode\]/g, mode || "development"))
			.map((file) => join(inputFileSystem, dir, file));
	}

	/**
	 * Load environment variables from .env files
	 * Similar to Vite's loadEnv implementation
	 * @private
	 * @param {Compiler} compiler compiler
	 * @param {CacheFacade} cache cache facade
	 * @param {FileSystemInfo} fileSystemInfo file system info
	 * @returns {Promise<{ env: Record<string, string>, snapshot: Snapshot }>} env with dependencies
	 */
	async _loadEnv(compiler, cache, fileSystemInfo) {
		const fs = /** @type {InputFileSystem} */ (compiler.inputFileSystem);
		const dir =
			typeof this.options.dir === "string"
				? this.options.dir
				: compiler.context;
		// Get env files to load
		const envFiles = this._getEnvFilesForMode(fs, dir, compiler.options.mode);
		/** @type {string[]} */
		const fileDependencies = [];
		/** @type {string[]} */
		const missingDependencies = [];

		const identifier = JSON.stringify(this.options.template);
		const itemCache = cache.getItemCache(identifier, null);

		const result = await itemCache.getPromise();

		if (result) {
			const isSnapshotValid = await new Promise((resolve, reject) => {
				fileSystemInfo.checkSnapshotValid(result.snapshot, (error, isValid) => {
					if (error) {
						reject(error);

						return;
					}

					resolve(isValid);
				});
			});

			if (isSnapshotValid) {
				const env = this._getEnv(result.parsed);

				return { env, snapshot: result.snapshot };
			}
		}

		// Read all files
		const contents = await Promise.all(
			envFiles.map((filePath) =>
				this._loadFile(fs, filePath).then(
					(content) => {
						fileDependencies.push(filePath);
						return content;
					},
					() => {
						// File doesn't exist, add to missingDependencies (this is normal)
						missingDependencies.push(filePath);
						return "";
					}
				)
			)
		);

		// Parse all files and merge (later files override earlier ones)
		// Similar to Vite's implementation
		const parsed = /** @type {Record<string, string>} */ ({});
		for (const content of contents) {
			if (!content) continue;
			const entries = parse(content);
			for (const key in entries) {
				parsed[key] = entries[key];
			}
		}

		const startTime = Date.now();
		const newSnapshot = await new Promise((resolve, reject) => {
			fileSystemInfo.createSnapshot(
				startTime,
				fileDependencies,
				null,
				missingDependencies,
				// `.env` files is a build dependencies
				compiler.options.snapshot.buildDependencies,
				(err, snapshot) => {
					if (err) return reject(err);
					resolve(snapshot);
				}
			);
		});

		await itemCache.storePromise({
			parsed,
			snapshot: newSnapshot,
			fileDependencies,
			missingDependencies
		});

		const env = this._getEnv(parsed);

		return { env, snapshot: newSnapshot };
	}

	/**
	 * Generate env variables
	 * @private
	 * @param {Record<string, string>} parsed parsed env variables
	 * @returns {Record<string, string>} env variables
	 */
	_getEnv(parsed) {
		const prefixes = this.options.prefix;

		// Always expand environment variables (like Vite does)
		// Make a copy of process.env so that dotenv-expand doesn't modify global process.env
		const processEnv = { ...process.env };
		expand({ parsed, processEnv });

		// Filter by prefixes and prioritize process.env (like Vite)
		const env = /** @type {Record<string, string>} */ ({});

		// First, add filtered vars from parsed .env files
		for (const [key, value] of Object.entries(parsed)) {
			if (prefixes.some((prefix) => key.startsWith(prefix))) {
				env[key] = value;
			}
		}

		// Then, prioritize actual env variables starting with prefixes
		// These are typically provided inline and should be prioritized (like Vite)
		for (const key in process.env) {
			if (prefixes.some((prefix) => key.startsWith(prefix))) {
				env[key] = /** @type {string} */ (process.env[key]);
			}
		}

		return env;
	}

	/**
	 * Load a file with proper path resolution
	 * @private
	 * @param {InputFileSystem} fs the input file system
	 * @param {string} file the file to load
	 * @returns {Promise<string>} the content of the file
	 */
	_loadFile(fs, file) {
		return new Promise((resolve, reject) => {
			fs.readFile(file, "utf8", (err, content) => {
				if (err) reject(err);
				else resolve(content || "");
			});
		});
	}
}

module.exports = DotenvPlugin;
