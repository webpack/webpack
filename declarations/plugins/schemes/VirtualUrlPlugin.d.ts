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
	 * The virtual modules configuration.
	 */
	modules: {
		/**
		 * A virtual module can be a string, a function, or a VirtualModule object.
		 */
		[k: string]: string;
	};
	/**
	 * The URL scheme to use for virtual resources.
	 */
	scheme?: string;
}
