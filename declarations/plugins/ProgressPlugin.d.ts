/**
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

export type ProgressPluginArgument = ProgressPluginOptions | HandlerFunction;
/**
 * Function that executes for every progress step
 */
export type HandlerFunction = ((
	percentage: number,
	msg: string,
	...args: string[]
) => void);

export interface ProgressPluginOptions {
	/**
	 * Function that executes for every progress step
	 */
	handler?: HandlerFunction;
	/**
	 * Minimum modules count to start with. Only for mode=modules. Default: 500
	 */
	modulesCount?: number;
	/**
	 * Collect profile data for progress steps. Default: false
	 */
	profile?: true | false | null;
}
