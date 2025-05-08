/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn fix:special` to update
 */

export type VirtualUrlPluginOptions = VirtualUrlOptions;

/**
 * Options for building virtual resources.
 */
export interface VirtualUrlOptions {
	/**
	 * The URL scheme to use for virtual resources.
	 */
	scheme?: string;
	/**
	 * The source function that provides the virtual content.
	 */
	source: (
		resourcePath: string,
		loaderContext: import("webpack").LoaderContext<any>
	) => Promise<string> | string;
}
