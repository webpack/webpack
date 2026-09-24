/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

// The options this plugin takes. `tooling/generate-schemas.js` derives the
// matching JSON schema from this file, so a change here is a change to what
// webpack validates, to its types and to its command line flags alike.

import { type AbsolutePath } from "../vocabulary";

/**
 * @additionalProperties
 * @schema
 */
export interface LoaderOptionsPluginOptions {
	/**
	 * Whether loaders should be in debug mode or not. debug will be removed as of webpack 3.
	 */
	debug?: boolean;
	/**
	 * Where loaders can be switched to minimize mode.
	 */
	minimize?: boolean;
	/**
	 * A configuration object that can be used to configure older loaders.
	 * @additionalProperties
	 */
	options?: {
		/**
		 * The context that can be used to configure older loaders.
		 */
		context?: AbsolutePath;
		[key: string]: any;
	};
	[key: string]: any;
}
