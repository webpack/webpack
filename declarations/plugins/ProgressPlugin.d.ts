/**
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

export type ProgressPluginArgument = ProgressPluginOptions | HandlerFunction;
/**
 * Function that executes for every progress step
 */
export type HandlerFunction = (
	percentage: number,
	msg: string,
	...args: string[]
) => void;

export interface ProgressPluginOptions {
	/**
	 * Show active modules count and one active module in progress message
	 */
	activeModules?: boolean;
	/**
	 * Show dependencies count in progress message
	 */
	dependencies?: boolean;
	/**
	 * Minimum dependencies count to start with. For better progress calculation. Default: 10000
	 */
	dependenciesCount?: number;
	/**
	 * Show entries count in progress message
	 */
	entries?: boolean;
	/**
	 * Function that executes for every progress step
	 */
	handler?: HandlerFunction;
	/**
	 * Show modules count in progress message
	 */
	modules?: boolean;
	/**
	 * Minimum modules count to start with. For better progress calculation. Default: 5000
	 */
	modulesCount?: number;
	/**
	 * Collect profile data for progress steps. Default: false
	 */
	profile?: true | false | null;
}
