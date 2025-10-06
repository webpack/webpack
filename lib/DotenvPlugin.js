/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const createSchemaValidation = require("./util/create-schema-validation");
const { isAbsolute, join } = require("./util/fs");

/** @typedef {import("../declarations/WebpackOptions").DotenvPluginOptions} DotenvPluginOptions */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./util/fs").InputFileSystem} InputFileSystem */

/** @type {DotenvPluginOptions} */
const DEFAULT_OPTIONS = {
	prefix: "WEBPACK_",
	dir: true,
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
 * @param {{ parsed: Record<string, string>, processEnv?: Record<string, string | undefined> }} options expand options
 * @returns {{ parsed: Record<string, string> }} expanded options
 */
function expand(options) {
	// for use with progressive expansion
	const runningParsed = /** @type {Record<string, string>} */ ({});

	let processEnv = process.env;
	if (
		options &&
		options.processEnv !== null &&
		options.processEnv !== undefined
	) {
		processEnv = options.processEnv;
	}

	// dotenv.config() ran before this so the assumption is process.env has already been set
	for (const key in options.parsed) {
		let value = options.parsed[key];

		// short-circuit scenario: process.env was already set prior to the file value
		value =
			processEnv[key] && processEnv[key] !== value
				? /** @type {string} */ (processEnv[key])
				: expandValue(value, processEnv, runningParsed);

		options.parsed[key] = _resolveEscapeSequences(value);

		// for use with progressive expansion
		runningParsed[key] = _resolveEscapeSequences(value);
	}

	for (const processKey in options.parsed) {
		if (processEnv) {
			processEnv[processKey] = options.parsed[processKey];
		}
	}

	return options;
}

/**
 * Resolve and validate env prefixes
 * Similar to Vite's resolveEnvPrefix
 * @param {string | string[] | undefined} rawPrefix raw prefix option
 * @returns {string[]} normalized prefixes array
 */
const resolveEnvPrefix = (rawPrefix) => {
	const prefixes = Array.isArray(rawPrefix)
		? rawPrefix
		: [rawPrefix || "WEBPACK_"];

	// Check for empty prefix (security issue like Vite does)
	if (prefixes.includes("")) {
		throw new Error(
			"prefix option contains value '', which could lead to unexpected exposure of sensitive information."
		);
	}

	return prefixes;
};

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
		this.config = { ...DEFAULT_OPTIONS, ...options };
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const definePlugin = new compiler.webpack.DefinePlugin({});

		/** @type {string[] | undefined} */
		let fileDependenciesCache;
		/** @type {string[] | undefined} */
		let missingDependenciesCache;

		compiler.hooks.beforeCompile.tapAsync(PLUGIN_NAME, (_params, callback) => {
			const inputFileSystem = /** @type {InputFileSystem} */ (
				compiler.inputFileSystem
			);
			const context = compiler.context;
			const mode = compiler.options.mode || "development";

			this.loadEnv(
				inputFileSystem,
				mode,
				context,
				(err, env, fileDependencies, missingDependencies) => {
					if (err) return callback(err);

					const definitions = envToDefinitions(env || {});

					// update the definitions
					definePlugin.definitions = definitions;
					// update the file dependencies
					fileDependenciesCache = fileDependencies;
					// update the missing dependencies
					missingDependenciesCache = missingDependencies;

					callback();
				}
			);
		});

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.fileDependencies.addAll(fileDependenciesCache || []);
			compilation.missingDependencies.addAll(missingDependenciesCache || []);
		});

		definePlugin.apply(compiler);
	}

	/**
	 * Get list of env files to load based on mode and template
	 * Similar to Vite's getEnvFilesForMode
	 * @param {InputFileSystem} inputFileSystem the input file system
	 * @param {string} dir the directory containing .env files
	 * @param {string | undefined} mode the mode (e.g., 'production', 'development')
	 * @returns {string[]} array of file paths to load
	 */
	getEnvFilesForMode(inputFileSystem, dir, mode) {
		if (!dir) {
			return [];
		}

		const { template } = /** @type {DotenvPluginOptions} */ (this.config);
		const templates = template || [];

		return templates
			.map((pattern) => pattern.replace(/\[mode\]/g, mode || "development"))
			.map((file) => join(inputFileSystem, dir, file));
	}

	/**
	 * Load environment variables from .env files
	 * Similar to Vite's loadEnv implementation
	 * @param {InputFileSystem} fs the input file system
	 * @param {string | undefined} mode the mode
	 * @param {string} context the compiler context
	 * @param {(err: Error | null, env?: Record<string, string>, fileDependencies?: string[], missingDependencies?: string[]) => void} callback callback function
	 * @returns {void}
	 */
	loadEnv(fs, mode, context, callback) {
		const { dir: rawDir, prefix: rawPrefix } =
			/** @type {DotenvPluginOptions} */ (this.config);

		let prefixes;
		try {
			prefixes = resolveEnvPrefix(rawPrefix);
		} catch (err) {
			return callback(/** @type {Error} */ (err));
		}
		const getDir = () => {
			if (typeof rawDir === "string") {
				if (isAbsolute(rawDir)) {
					return rawDir;
				}
				return join(fs, context, rawDir);
			}
			if (rawDir === true) {
				return context;
			}
			return "";
		};

		/** @type {string} */
		const dir = getDir();
		// Get env files to load
		const envFiles = this.getEnvFilesForMode(fs, dir, mode);
		/** @type {string[]} */
		const fileDependencies = [];
		/** @type {string[]} */
		const missingDependencies = [];

		// Read all files
		const readPromises = envFiles.map((filePath) =>
			this.loadFile(fs, filePath).then(
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
		);

		Promise.all(readPromises)
			.then((contents) => {
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

				callback(null, env, fileDependencies, missingDependencies);
			})
			.catch((err) => {
				callback(err);
			});
	}

	/**
	 * Load a file with proper path resolution
	 * @param {InputFileSystem} fs the input file system
	 * @param {string} file the file to load
	 * @returns {Promise<string>} the content of the file
	 */
	loadFile(fs, file) {
		return new Promise((resolve, reject) => {
			fs.readFile(file, "utf8", (err, content) => {
				if (err) reject(err);
				else resolve(content || "");
			});
		});
	}
}

module.exports = DotenvPlugin;
