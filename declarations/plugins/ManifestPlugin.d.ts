/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn fix:special` to update
 */

/**
 * A function that receives the manifest object and returns the manifest string.
 */
export type HandlerFunction = (manifest: ManifestObject) => string;
/**
 * Maps asset identifiers to their manifest entries.
 */
export type ManifestObject = Record<string, ManifestItem>;

export interface ManifestPluginOptions {
	/**
	 * Specifies the filename of the output file on disk. By default the plugin will emit `manifest.json` inside the 'output.path' directory.
	 */
	filename?: string;
	/**
	 * A function that receives the manifest object and returns the manifest string.
	 */
	handler?: HandlerFunction;
}
/**
 * Describes a manifest entry that links the emitted path to the producing asset.
 */
export interface ManifestItem {
	/**
	 * The compilation asset that produced this manifest entry.
	 */
	asset?: import("../../lib/Compilation").Asset;
	/**
	 * The public path recorded in the manifest for this asset.
	 */
	filePath: string;
}
