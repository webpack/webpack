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
	| import("../../../lib/schemes/VirtualUrlPlugin").SourceFn
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
	 * The context for the virtual module. A string path. Defaults to 'auto', which will try to resolve the context from the module id.
	 */
	context?: string;
	/**
	 * The source function that provides the virtual content.
	 */
	source: import("../../../lib/schemes/VirtualUrlPlugin").SourceFn;
	/**
	 * The module type.
	 */
	type?: string;
	/**
	 * Optional version function or value for cache invalidation.
	 */
	version?:
		| true
		| string
		| import("../../../lib/schemes/VirtualUrlPlugin").VersionFn;
}
