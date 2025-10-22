/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn fix:special` to update
 */

export interface ManifestPluginOptions {
	/**
	 * Enables/disables generation of the entrypoints manifest section.
	 */
	entrypoints?: boolean;
	/**
	 * Specifies the filename of the output file on disk. By default the plugin will emit `manifest.json` inside the 'output.path' directory.
	 */
	filename?: string;
	/**
	 * Allows filtering the files which make up the manifest.
	 */
	filter?: (item: ManifestItem) => boolean;
	/**
	 * A function that receives the manifest object, modifies it, and returns the modified manifest.
	 */
	generate?: (manifest: ManifestObject) => ManifestObject;
	/**
	 * Specifies a path prefix for all keys in the manifest.
	 */
	prefix?: string;
	/**
	 * A function that receives the manifest object and returns the manifest string.
	 */
	serialize?: (manifest: ManifestObject) => string;
}
/**
 * Describes a manifest entrypoint.
 */
export interface ManifestEntrypoint {
	/**
	 * Contains the names of entrypoints.
	 */
	imports: string[];
	/**
	 * Contains the names of parent entrypoints.
	 */
	parents?: string[];
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
	[k: string]: any;
}
