/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

// The options this plugin takes. `tooling/generate-schemas.js` derives the
// matching JSON schema from this file, so a change here is a change to what
// webpack validates, to its types and to its command line flags alike.

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
		| /** @jsonType boolean */ true
		| string
		| import("../../../lib/schemes/VirtualUrlPlugin").VersionFn;
}

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
	 * The default context for virtual modules. A string path. Defaults to 'auto', which will try to resolve the context from the module id.
	 */
	context?: string;
	/**
	 * The virtual modules configuration.
	 */
	modules: {
		[key: string]: VirtualModuleContent;
	};
	/**
	 * The URL scheme to use for virtual resources.
	 */
	scheme?: string;
}

/**
 * @schema
 */
export type VirtualUrlPluginOptions = VirtualUrlOptions;
