/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

export interface CleanPluginArgument {
	/**
	 * Log the assets that should be removed instead of delete them.
	 */
	dry?: boolean;
	/**
	 * Not delete the assets, that matches to this regexp or a function.
	 */
	ignore?: RegExp | ((asset: string) => boolean);
}
