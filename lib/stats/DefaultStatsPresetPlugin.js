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
		hash: true,
		builtAt: true,
		relatedAssets: true,
		entrypoints: true,
		chunkGroups: true,
		ids: true,
		modules: false,
		chunks: true,
		chunkRelations: true,
		chunkModules: true,
		dependentModules: true,
		chunkOrigins: true,
		depth: true,
		env: true,
		reasons: true,
		usedExports: true,
		providedExports: true,
		optimizationBailout: true,
		errorDetails: true,
		errorStack: true,
		publicPath: true,
		logging: "verbose",
		orphanModules: true,
		runtimeModules: true,
		exclude: false,
		modulesSpace: Infinity,
		assetsSpace: Infinity,
		children: true
	},
	detailed: {
		hash: true,
		builtAt: true,
		relatedAssets: true,
		entrypoints: true,
		chunkGroups: true,
		ids: true,
		chunks: true,
		chunkRelations: true,
		chunkModules: false,
		chunkOrigins: true,
		depth: true,
		usedExports: true,
		providedExports: true,
		optimizationBailout: true,
		errorDetails: true,
		publicPath: true,
		logging: true,
		runtimeModules: true,
		exclude: false,
		modulesSpace: Infinity,
		assetsSpace: Infinity
	},
	minimal: {
		all: false,
		version: true,
		timings: true,
		modules: true,
		modulesSpace: 0,
		assets: true,
		assetsSpace: 0,
		errors: true,
		errorsCount: true,
		warnings: true,
		warningsCount: true,
		logging: "warn"
	},
	"errors-only": {
		all: false,
		errors: true,
		errorsCount: true,
		moduleTrace: true,
		logging: "error"
	},
	"errors-warnings": {
		all: false,
		errors: true,
		errorsCount: true,
		warnings: true,
		warningsCount: true,
		logging: "warn"
	},
	summary: {
		all: false,
		version: true,
		errorsCount: true,
		warningsCount: true
	},
	none: {
		all: false
	}
};

const NORMAL_ON = ({ all }) => all !== false;
const NORMAL_OFF = ({ all }) => all === true;
const ON_FOR_TO_STRING = ({ all }, { forToString }) =>
	forToString ? all !== false : all === true;
const OFF_FOR_TO_STRING = ({ all }, { forToString }) =>
	forToString ? all === true : all !== false;

/** @type {Record<string, (options: Object, context: { forToString: boolean, cached: boolean, runtime: boolean }, compilation: Compilation) => any>} */
const DEFAULTS = {
	context: (options, context, compilation) => compilation.compiler.context,
	requestShortener: (options, context, compilation) =>
		compilation.compiler.context === options.context
			? compilation.requestShortener
			: new RequestShortener(options.context, compilation.compiler.root),
	performance: NORMAL_ON,
	hash: OFF_FOR_TO_STRING,
	env: NORMAL_OFF,
	version: NORMAL_ON,
	timings: NORMAL_ON,
	builtAt: OFF_FOR_TO_STRING,
	assets: NORMAL_ON,
	entrypoints: ({ all }, { forToString }) => {
		if (all === false) return false;
		if (all === true) return true;
		if (forToString) return "auto";
		return true;
	},
	chunkGroups: OFF_FOR_TO_STRING,
	chunkGroupAuxiliary: OFF_FOR_TO_STRING,
	chunkGroupChildren: OFF_FOR_TO_STRING,
	chunkGroupMaxAssets: (o, { forToString }) => (forToString ? 5 : Infinity),
	chunks: OFF_FOR_TO_STRING,
	chunkRelations: OFF_FOR_TO_STRING,
	chunkModules: ({ all, modules }) => {
		if (all === false) return false;
		if (all === true) return true;
		if (modules) return false;
		return true;
	},
	dependentModules: OFF_FOR_TO_STRING,
	chunkOrigins: OFF_FOR_TO_STRING,
	ids: OFF_FOR_TO_STRING,
	modules: ({ all, chunks, chunkModules }, { forToString }) => {
		if (all === false) return false;
		if (all === true) return true;
		if (forToString && chunks && chunkModules) return false;
		return true;
	},
	nestedModules: OFF_FOR_TO_STRING,
	groupModulesByType: ON_FOR_TO_STRING,
	groupModulesByCacheStatus: ON_FOR_TO_STRING,
	groupModulesByAttributes: ON_FOR_TO_STRING,
	groupModulesByPath: ON_FOR_TO_STRING,
	groupModulesByExtension: ON_FOR_TO_STRING,
	modulesSpace: (o, { forToString }) => (forToString ? 15 : Infinity),
	chunkModulesSpace: (o, { forToString }) => (forToString ? 10 : Infinity),
	nestedModulesSpace: (o, { forToString }) => (forToString ? 10 : Infinity),
	relatedAssets: OFF_FOR_TO_STRING,
	groupAssetsByEmitStatus: ON_FOR_TO_STRING,
	groupAssetsByInfo: ON_FOR_TO_STRING,
	groupAssetsByPath: ON_FOR_TO_STRING,
	groupAssetsByExtension: ON_FOR_TO_STRING,
	groupAssetsByChunk: ON_FOR_TO_STRING,
	assetsSpace: (o, { forToString }) => (forToString ? 15 : Infinity),
	orphanModules: OFF_FOR_TO_STRING,
	runtimeModules: ({ all }, { forToString, runtime }) =>
		runtime !== undefined
			? runtime
			: forToString
			? all === true
			: all !== false,
	cachedModules: ({ all }, { forToString, cached }) =>
		cached !== undefined ? cached : forToString ? all === true : all !== false,
	moduleAssets: OFF_FOR_TO_STRING,
	depth: OFF_FOR_TO_STRING,
	cachedAssets: OFF_FOR_TO_STRING,
	reasons: OFF_FOR_TO_STRING,
	usedExports: OFF_FOR_TO_STRING,
	providedExports: OFF_FOR_TO_STRING,
	optimizationBailout: OFF_FOR_TO_STRING,
	children: OFF_FOR_TO_STRING,
	source: NORMAL_OFF,
	moduleTrace: NORMAL_ON,
	errors: NORMAL_ON,
	errorsCount: NORMAL_ON,
	errorDetails: OFF_FOR_TO_STRING,
	errorStack: OFF_FOR_TO_STRING,
	warnings: NORMAL_ON,
	warningsCount: NORMAL_ON,
	publicPath: OFF_FOR_TO_STRING,
	logging: ({ all }, { forToString }) =>
		forToString && all !== false ? "info" : false,
	loggingDebug: () => [],
	loggingTrace: OFF_FOR_TO_STRING,
	excludeModules: () => [],
	excludeAssets: () => [],
	modulesSort: () => "depth",
	chunkModulesSort: () => "name",
	nestedModulesSort: () => false,
	chunksSort: () => false,
	assetsSort: () => "!size",
	outputPath: OFF_FOR_TO_STRING,
	colors: () => false
};

const normalizeFilter = item => {
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
		return value.map(normalizeFilter);
	},
	excludeAssets: value => {
		if (!Array.isArray(value)) {
			value = value ? [value] : [];
		}
		return value.map(normalizeFilter);
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
	},
	logging: value => {
		if (value === true) value = "log";
		return value;
	},
	loggingDebug: value => {
		if (!Array.isArray(value)) {
			value = value ? [value] : [];
		}
		return value.map(normalizeFilter);
	}
};

class DefaultStatsPresetPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("DefaultStatsPresetPlugin", compilation => {
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
