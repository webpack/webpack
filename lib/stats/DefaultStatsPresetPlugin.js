/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RequestShortener = require("../RequestShortener");

/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compiler")} Compiler */

const applyDefaults = (options, defaults) => {
	for (const key of Object.keys(defaults)) {
		if (typeof options[key] === "undefined") {
			options[key] = defaults[key];
		}
	}
};

const NAMED_PRESETS = {
	verbose: {
		entrypoints: true,
		chunkGroups: true,
		modules: false,
		chunks: true,
		chunkRelations: true,
		chunkModules: true,
		chunkRootModules: false,
		chunkOrigins: true,
		depth: true,
		env: true,
		reasons: true,
		usedExports: true,
		providedExports: true,
		optimizationBailout: true,
		errorDetails: true,
		publicPath: true,
		orphanModules: true,
		runtime: true,
		exclude: false,
		maxModules: Infinity
	},
	detailed: {
		entrypoints: true,
		chunkGroups: true,
		chunks: true,
		chunkRelations: true,
		chunkModules: false,
		chunkRootModules: false,
		chunkOrigins: true,
		depth: true,
		usedExports: true,
		providedExports: true,
		optimizationBailout: true,
		errorDetails: true,
		publicPath: true,
		runtimeModules: true,
		runtime: true,
		exclude: false,
		maxModules: Infinity
	},
	minimal: {
		all: false,
		modules: true,
		maxModules: 0,
		errors: true,
		warnings: true
	},
	"errors-only": {
		all: false,
		errors: true,
		moduleTrace: true
	},
	"errors-warnings": {
		all: false,
		errors: true,
		warnings: true
	},
	none: {
		all: false
	}
};

const NORMAL_ON = ({ all }) => all !== false;
const NORMAL_OFF = ({ all }) => all === true;
const OFF_FOR_TO_STRING = ({ all }, { forToString }) =>
	forToString ? all === true : all !== false;

/** @type {Record<string, (options: Object, context: { forToString: boolean }, compilation: Compilation) => any>} */
const DEFAULTS = {
	context: (options, context, compilation) => compilation.compiler.context,
	requestShortener: (options, context, compilation) =>
		compilation.compiler.context === options.context
			? compilation.requestShortener
			: new RequestShortener(options.context),
	performance: NORMAL_ON,
	hash: NORMAL_ON,
	env: NORMAL_OFF,
	version: NORMAL_ON,
	timings: NORMAL_ON,
	builtAt: NORMAL_ON,
	assets: NORMAL_ON,
	entrypoints: NORMAL_ON,
	chunkGroups: OFF_FOR_TO_STRING,
	chunks: OFF_FOR_TO_STRING,
	chunkRelations: OFF_FOR_TO_STRING,
	chunkModules: OFF_FOR_TO_STRING,
	chunkRootModules: ({ all, chunkModules }, { forToString }) => {
		if (all === false) return false;
		if (all === true) return true;
		if (forToString && chunkModules) return false;
		return true;
	},
	chunkOrigins: OFF_FOR_TO_STRING,
	modules: NORMAL_ON,
	nestedModules: OFF_FOR_TO_STRING,
	orphanModules: NORMAL_OFF,
	moduleAssets: OFF_FOR_TO_STRING,
	depth: OFF_FOR_TO_STRING,
	cached: NORMAL_ON,
	runtime: OFF_FOR_TO_STRING,
	cachedAssets: NORMAL_ON,
	reasons: OFF_FOR_TO_STRING,
	usedExports: OFF_FOR_TO_STRING,
	providedExports: OFF_FOR_TO_STRING,
	optimizationBailout: OFF_FOR_TO_STRING,
	children: NORMAL_ON,
	source: NORMAL_OFF,
	moduleTrace: NORMAL_ON,
	errors: NORMAL_ON,
	errorDetails: OFF_FOR_TO_STRING,
	warnings: NORMAL_ON,
	publicPath: OFF_FOR_TO_STRING,
	excludeModules: () => [],
	excludeAssets: () => [],
	maxModules: (o, { forToString }) => (forToString ? 15 : Infinity),
	modulesSort: () => "id",
	chunksSort: () => "id",
	assetsSort: () => "name",
	outputPath: OFF_FOR_TO_STRING,
	colors: () => false
};

const normalizeExclude = item => {
	if (typeof item === "string") {
		const regExp = new RegExp(
			`[\\\\/]${item.replace(
				// eslint-disable-next-line no-useless-escape
				/[-[\]{}()*+?.\\^$|]/g,
				"\\$&"
			)}([\\\\/]|$|!|\\?)`
		);
		return ident => regExp.test(ident);
	}
	if (item && typeof item === "object" && typeof item.test === "function") {
		return ident => item.test(ident);
	}
	if (typeof item === "function") {
		return item;
	}
	if (typeof item === "boolean") {
		return () => item;
	}
};

const NORMALIZER = {
	excludeModules: value => {
		if (!Array.isArray(value)) {
			value = value ? [value] : [];
		}
		return value.map(normalizeExclude);
	},
	excludeAssets: value => {
		if (!Array.isArray(value)) {
			value = value ? [value] : [];
		}
		return value.map(normalizeExclude);
	},
	warningsFilter: value => {
		if (!Array.isArray(value)) {
			value = value ? [value] : [];
		}
		return value.map(filter => {
			if (typeof filter === "string") {
				return (warning, warningString) => warningString.includes(filter);
			}
			if (filter instanceof RegExp) {
				return (warning, warningString) => filter.test(warningString);
			}
			if (typeof filter === "function") {
				return filter;
			}
			throw new Error(
				`Can only filter warnings with Strings or RegExps. (Given: ${filter})`
			);
		});
	}
};

class DefaultStatsPresetPlugin {
	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("DefaultStatsPresetPlugin", compilation => {
			compilation.hooks.statsPreset
				.for(false)
				.tap("DefaultStatsPresetPlugin", (options, context) => {
					applyDefaults(options, NAMED_PRESETS.none);
				});
			for (const key of Object.keys(NAMED_PRESETS)) {
				const defaults = NAMED_PRESETS[key];
				compilation.hooks.statsPreset
					.for(key)
					.tap("DefaultStatsPresetPlugin", (options, context) => {
						applyDefaults(options, defaults);
					});
			}
			compilation.hooks.statsNormalize.tap(
				"DefaultStatsPresetPlugin",
				(options, context) => {
					for (const key of Object.keys(DEFAULTS)) {
						if (options[key] === undefined)
							options[key] = DEFAULTS[key](options, context, compilation);
					}
					for (const key of Object.keys(NORMALIZER)) {
						options[key] = NORMALIZER[key](options[key]);
					}
				}
			);
		});
	}
}
module.exports = DefaultStatsPresetPlugin;
