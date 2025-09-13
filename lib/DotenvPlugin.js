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
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.beforeCompile.tapAsync(PLUGIN_NAME, (_params, callback) => {
			const inputFileSystem = /** @type {InputFileSystem} */ (
				compiler.inputFileSystem
			);
			const context = compiler.context;

			this.gatherVariables(inputFileSystem, context, (err, variables) => {
				if (err) return callback(err);

				const definitions = this.formatDefinitions(variables || {});
				const DefinePlugin = compiler.webpack.DefinePlugin;

				new DefinePlugin(definitions).apply(compiler);
				callback();
			});
		});
	}

	/**
	 * @param {InputFileSystem} inputFileSystem the input file system
	 * @param {string} context the compiler context
	 * @param {(err: Error | null, variables?: Record<string, string>) => void} callback callback function
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

			const { env, blueprint } = result;

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

				callback(null, vars);
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
	 * @param {(err: Error | null, result?: {env: Record<string, string>, blueprint: Record<string, string>}) => void} callback callback function
	 * @returns {void}
	 */
	getEnvs(inputFileSystem, context, callback) {
		const { path, safe } = /** @type {DotenvPluginOptions} */ (this.config);

		// First load the main env file and defaults
		this.loadFile(
			{
				file: path || DEFAULT_PATH,
				inputFileSystem,
				context
			},
			(err, envContent) => {
				if (err) return callback(err);

				this.getDefaults(inputFileSystem, context, (err, defaultsContent) => {
					if (err) return callback(err);

					const env = mergeParse(envContent || "", defaultsContent || "");
					let blueprint = env;

					if (safe) {
						let file = `${path || DEFAULT_PATH}.example`;
						if (safe !== true) {
							file = safe;
						}

						this.loadFile(
							{
								file,
								inputFileSystem,
								context
							},
							(err, blueprintContent) => {
								if (err) return callback(err);

								blueprint = mergeParse(blueprintContent || "");
								callback(null, { env, blueprint });
							}
						);
					} else {
						callback(null, { env, blueprint });
					}
				});
			}
		);
	}

	/**
	 * @param {InputFileSystem} inputFileSystem the input file system
	 * @param {string} context the compiler context
	 * @param {(err: Error | null, content?: string) => void} callback callback function
	 * @returns {void}
	 */
	getDefaults(inputFileSystem, context, callback) {
		const { path, defaults } = /** @type {DotenvPluginOptions} */ (this.config);

		if (defaults) {
			const defaultsFile =
				defaults === true ? `${path || DEFAULT_PATH}.defaults` : defaults;
			this.loadFile(
				{
					file: defaultsFile,
					inputFileSystem,
					context
				},
				callback
			);
		} else {
			callback(null, "");
		}
	}

	/**
	 * Load a file with proper path resolution
	 * @param {object} options options object
	 * @param {string} options.file the file to load
	 * @param {InputFileSystem} options.inputFileSystem the input file system
	 * @param {string} options.context the compiler context for resolving relative paths
	 * @param {(err: Error | null, content?: string) => void} callback callback function
	 * @returns {void}
	 */
	loadFile({ file, inputFileSystem, context }, callback) {
		// Resolve relative paths based on compiler context
		const resolvedPath = isAbsolute(file)
			? file
			: join(inputFileSystem, context, file);

		inputFileSystem.readFile(resolvedPath, "utf8", (err, content) => {
			if (err) {
				// File doesn't exist, return empty string
				callback(null, "");
			} else {
				callback(null, /** @type {string} */ (content));
			}
		});
	}

	/**
	 * @param {Record<string, string>} variables variables object
	 * @returns {Record<string, string>} formatted data
	 */
	formatDefinitions(variables) {
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
