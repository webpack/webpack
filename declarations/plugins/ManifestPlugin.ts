/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

// The options this plugin takes. `tooling/generate-schemas.js` derives the
// matching JSON schema from this file, so a change here is a change to what
// webpack validates, to its types and to its command line flags alike.

import { type NonEmptyRelativePath, type NonEmptyString } from "../vocabulary";

/**
 * Describes a manifest entrypoint.
 */
export interface ManifestEntrypoint {
	/**
	 * Contains the names of entrypoints.
	 */
	imports: Array</** The name of file. */ NonEmptyString>;
	/**
	 * Contains the names of parent entrypoints.
	 */
	parents?: Array</** The entrypoint name. */ NonEmptyString>;
}

/**
 * Describes a manifest asset that links the emitted path to the producing asset.
 */
export interface ManifestItem {
	/**
	 * The path absolute URL (this indicates that the path is absolute from the server's root directory) to file.
	 */
	file: string;
	/**
	 * The source path relative to the context.
	 */
	src?: string;
}

/**
 * The manifest object.
 * @additionalProperties
 */
export interface ManifestObject {
	/**
	 * Contains the names of assets.
	 */
	assets: Record<string, ManifestItem>;
	/**
	 * Contains the names of entrypoints.
	 */
	entrypoints: Record<string, ManifestEntrypoint>;
	[key: string]: any;
}

/**
 * @schema
 */
export interface ManifestPluginOptions {
	/**
	 * Enables/disables generation of the entrypoints manifest section.
	 */
	entrypoints?: boolean;
	/**
	 * Specifies the filename of the output file on disk. By default the plugin will emit `manifest.json` inside the 'output.path' directory.
	 */
	filename?: NonEmptyRelativePath;
	/**
	 * Allows filtering the files which make up the manifest.
	 */
	filter?: import("../../lib/output/ManifestPlugin").Filter;
	/**
	 * A function that receives the manifest object, modifies it, and returns the modified manifest.
	 */
	generate?: import("../../lib/output/ManifestPlugin").Generate;
	/**
	 * Specifies a path prefix for all keys in the manifest.
	 */
	prefix?: string;
	/**
	 * A function that receives the manifest object and returns the manifest string.
	 */
	serialize?: import("../../lib/output/ManifestPlugin").Serialize;
}
