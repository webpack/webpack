/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn fix:special` to update
 */

export type VirtualUrlPluginOptions = VirtualUrlOptions;
/**
 * A virtual module can be a string, a function, or a VirtualModule object.
 */
export type VirtualModuleContent =
	| string
	| ((
			loaderContext: import("webpack").LoaderContext<EXPECTED_ANY>
	  ) => Promise<string> | string)
	| VirtualModule;

/**
 * Options for building virtual resources.
 */
export interface VirtualUrlOptions {
	/**
	 * The virtual modules configuration.
	 */
	modules: {
		[k: string]: VirtualModuleContent;
	};
	/**
	 * The URL scheme to use for virtual resources.
	 */
	scheme?: string;
}
/**
 * A virtual module definition.
 */
export interface VirtualModule {
	/**
	 * The source function that provides the virtual content.
	 */
	source: (
		loaderContext: import("webpack").LoaderContext<EXPECTED_ANY>
	) => Promise<string> | string;
	/**
	 * The module type.
	 */
	type?: string;
	/**
	 * Optional version function or value for cache invalidation.
	 */
	version?: true | string | (() => string | undefined);
}
