/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

// The options this plugin takes. `tooling/generate-schemas.js` derives the
// matching JSON schema from this file, so a change here is a change to what
// webpack validates, to its types and to its command line flags alike.

import { type AbsolutePath, type NonEmptyRelativePath } from "../vocabulary";

/**
 * @schema
 */
export interface SSRManifestPluginOptions {
	/**
	 * The base directory used to compute the source-module keys (defaults to the compiler context).
	 * @since 5.111.0
	 */
	context?: AbsolutePath;
	/**
	 * Specifies the filename of the emitted manifest on disk. By default the plugin will emit `ssr-manifest.json` inside the 'output.path' directory.
	 * @since 5.111.0
	 */
	filename?: NonEmptyRelativePath;
}
