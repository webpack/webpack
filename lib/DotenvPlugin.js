/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const createSchemaValidation = require("./util/create-schema-validation");
const { isAbsolute, join } = require("./util/fs");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./util/fs").InputFileSystem} InputFileSystem */
/** @typedef {import("../declarations/plugins/DotenvPlugin").DotenvPluginOptions} DotenvPluginOptions */

const DEFAULT_PATH = "./.env";

const DEFAULT_OPTIONS = {
	path: DEFAULT_PATH,
	prefix: "process.env."
};

const LINE =
	/(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/gm;

const PLUGIN_NAME = "DotenvPlugin";

const validate = createSchemaValidation(
	require("../schemas/plugins/DotenvPlugin.check"),
	() => require("../schemas/plugins/DotenvPlugin.json"),
	{
		name: "Dotenv Plugin",
		baseDataPath: "options"
	}
);

/**
 * @param {string} env environment variable value
 * @param {Record<string, string>} vars variables object
 * @returns {string} interpolated value
 */
const interpolate = (env, vars) => {
	const matches = env.match(/\$([a-zA-Z0-9_]+)|\${([a-zA-Z0-9_]+)}/g) || [];

	for (const match of matches) {
		const key = match.replace(/\$|{|}/g, "");
		let variable = vars[key] || "";
		variable = interpolate(variable, vars);
		env = env.replace(match, variable);
	}

	return env;
};

/**
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
 * Parses objects like before, but with defaults!
 * @param {string} src the original src
 * @param {string=} defaultSrc the new-and-improved default source
 * @returns {Record<string, string>} the parsed results
 */
const mergeParse = (src, defaultSrc = "") => {
	const parsedSrc = parse(src);
	const parsedDefault = parse(defaultSrc);

	return { ...parsedDefault, ...parsedSrc };
};

// ported from https://github.com/mrsteele/dotenv-webpack
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
		/** @type {string[] | undefined} */
		let fileDependenciesCache;

		compiler.hooks.beforeCompile.tapAsync(PLUGIN_NAME, (_params, callback) => {
			const inputFileSystem = /** @type {InputFileSystem} */ (
				compiler.inputFileSystem
			);
			const context = compiler.context;

			this.gatherVariables(
				inputFileSystem,
				context,
				(err, variables, fileDependencies) => {
					if (err) return callback(err);
					const definitions = this.formatVariables(variables || {});
					const DefinePlugin = compiler.webpack.DefinePlugin;

					new DefinePlugin(definitions).apply(compiler);
					fileDependenciesCache = fileDependencies;

					callback();
				}
			);
		});

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.fileDependencies.addAll(fileDependenciesCache || []);
		});
	}

	/**
	 * @param {InputFileSystem} inputFileSystem the input file system
	 * @param {string} context the compiler context
	 * @param {(err: Error | null, variables?: Record<string, string>, fileDependencies?: string[]) => void} callback callback function
	 * @returns {void}
	 */
	gatherVariables(inputFileSystem, context, callback) {
		const { safe, allowEmptyValues } = /** @type {DotenvPluginOptions} */ (
			this.config
		);
		const vars = /** @type {Record<string, string>} */ (this.initializeVars());

		this.getEnvs(inputFileSystem, context, (err, result) => {
			if (err) return callback(err);
			if (!result) {
				return callback(new Error("Failed to get environment variables"));
			}

			const { env, blueprint, fileDependencies } = result;

			try {
				for (const key of Object.keys(blueprint)) {
					const value = Object.prototype.hasOwnProperty.call(vars, key)
						? vars[key]
						: env[key];

					const isMissing =
						typeof value === "undefined" ||
						value === null ||
						(!allowEmptyValues && value === "");

					if (safe && isMissing) {
						throw new Error(`Missing environment variable: ${key}`);
					} else {
						vars[key] = value;
					}
				}

				// add the leftovers
				if (safe) {
					for (const key of Object.keys(env)) {
						if (!Object.prototype.hasOwnProperty.call(vars, key)) {
							vars[key] = env[key];
						}
					}
				}

				callback(null, vars, fileDependencies);
			} catch (error) {
				callback(error instanceof Error ? error : new Error(String(error)));
			}
		});
	}

	initializeVars() {
		const config = /** @type {DotenvPluginOptions} */ (this.config);
		if (config.systemvars) {
			const vars = /** @type {Record<string, string>} */ ({});
			for (const key in process.env) {
				if (process.env[key] !== undefined) {
					vars[key] = /** @type {string} */ (process.env[key]);
				}
			}
			return vars;
		}
		return /** @type {Record<string, string>} */ ({});
	}

	/**
	 * @param {InputFileSystem} inputFileSystem the input file system
	 * @param {string} context the compiler context
	 * @param {(err: Error | null, result?: {env: Record<string, string>, blueprint: Record<string, string>, fileDependencies: string[]}) => void} callback callback function
	 * @returns {void}
	 */
	getEnvs(inputFileSystem, context, callback) {
		const { path, safe, defaults } = /** @type {DotenvPluginOptions} */ (
			this.config
		);

		const loadPromises = [];
		/** @type {string[]} */
		const loadFiles = [];

		const resolvedMainEnvFile = this.resolvePath(
			/** @type {string} */ (path),
			inputFileSystem,
			context
		);
		loadPromises.push(this.loadFile(inputFileSystem, resolvedMainEnvFile));
		loadFiles.push(resolvedMainEnvFile);
		if (defaults) {
			const defaultsFile =
				defaults === true ? `${path || DEFAULT_PATH}.defaults` : defaults;
			const resolvedDefaultsFile = this.resolvePath(
				/** @type {string} */ (defaultsFile),
				inputFileSystem,
				context
			);
			loadPromises.push(this.loadFile(inputFileSystem, resolvedDefaultsFile));
			loadFiles.push(resolvedDefaultsFile);
		} else {
			loadPromises.push(Promise.resolve(""));
		}
		if (safe) {
			const safeFile = safe === true ? `${path || DEFAULT_PATH}.example` : safe;
			const resolvedSafeFile = this.resolvePath(
				/** @type {string} */ (safeFile),
				inputFileSystem,
				context
			);
			loadPromises.push(this.loadFile(inputFileSystem, resolvedSafeFile));
			loadFiles.push(resolvedSafeFile);
		} else {
			loadPromises.push(Promise.resolve(""));
		}

		Promise.all(loadPromises)
			.then(([envContent, defaultsContent, safeContent]) => {
				const env = mergeParse(envContent || "", defaultsContent || "");
				let blueprint = env;
				if (safeContent) {
					blueprint = mergeParse(safeContent || "");
				}
				callback(null, { env, blueprint, fileDependencies: loadFiles });
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
				resolve(content || "");
			});
		});
	}

	/**
	 * @param {string} file the file to load
	 * @param {InputFileSystem} inputFileSystem the input file system
	 * @param {string} context the compiler context for resolving relative paths
	 * @returns {string} the resolved path
	 */
	resolvePath(file, inputFileSystem, context) {
		return isAbsolute(file) ? file : join(inputFileSystem, context, file);
	}

	/**
	 * @param {Record<string, string>} variables variables object
	 * @returns {Record<string, string>} formatted data
	 */
	formatVariables(variables) {
		const { expand, prefix } = /** @type {DotenvPluginOptions} */ (this.config);
		const formatted = Object.keys(variables).reduce((obj, key) => {
			const v = variables[key];
			const vKey = `${prefix}${key}`;
			let vValue;
			if (expand) {
				if (v.slice(0, 2) === "\\$") {
					vValue = v.slice(1);
				} else if (v.indexOf("\\$") > 0) {
					vValue = v.replace(/\\\$/g, "$");
				} else {
					vValue = interpolate(v, variables);
				}
			} else {
				vValue = v;
			}

			obj[vKey] = JSON.stringify(vValue);

			return obj;
		}, /** @type {Record<string, string>} */ ({}));

		return formatted;
	}
}

module.exports = DotenvPlugin;
