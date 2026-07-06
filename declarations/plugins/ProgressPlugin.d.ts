/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn fix:special` to update
 */

export type ProgressPluginArgument = ProgressPluginOptions | HandlerFunction;
/**
 * Function that executes for every progress step.
 */
export type HandlerFunction = import("../../lib/ProgressPlugin").HandlerFn;

/**
 * Options object for the ProgressPlugin.
 */
export interface ProgressPluginOptions {
	/**
	 * Show active modules count and one active module in progress message.
	 */
	activeModules?: boolean;
	/**
	 * Show dependencies count in progress message.
	 */
	dependencies?: boolean;
	/**
	 * Minimum dependencies count to start with. For better progress calculation. Default: 10000.
	 */
	dependenciesCount?: number;
	/**
	 * Show entries count in progress message.
	 */
	entries?: boolean;
	/**
	 * Show estimated time remaining based on build progress. Default: false.
	 */
	estimatedTime?: boolean;
	/**
	 * Function that executes for every progress step.
	 */
	handler?: HandlerFunction;
	/**
	 * Show modules count in progress message.
	 */
	modules?: boolean;
	/**
	 * Minimum modules count to start with. For better progress calculation. Default: 5000.
	 */
	modulesCount?: number;
	/**
	 * Collect percent algorithm. By default it calculates by a median from modules, entries and dependencies percent.
	 */
	percentBy?: "entries" | "modules" | "dependencies" | null;
	/**
	 * Show a timing breakdown for each build phase when the build completes. Default: false.
	 */
	phaseTimings?: boolean;
	/**
	 * Collect profile data for progress steps. Default: false.
	 */
	profile?: true | false | null;
	/**
	 * Generate progress bar. `"auto"` enables it only for interactive terminals. Default: false.
	 */
	progressBar?:
		| boolean
		| "auto"
		| {
				/**
				 * Color used for the filled portion of the bar.
				 */
				color?: string;
				/**
				 * Name shown before the progress bar.
				 */
				name?: string;
				/**
				 * Width of the progress bar in characters. Default: 25.
				 */
				width?: number;
		  };
}
