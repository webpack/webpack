/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn fix:special` to update
 */

export interface ManifestPluginOptions {
	/**
	 * Specifies the filename of the output file on disk. By default the plugin will emit `manifest.json` inside the 'output.path' directory.
	 */
	filename?: string;
	/**
	 * A custom Function to create the manifest.
	 */
	handle?: (
		manifest: Record<string, string>,
		stats: import("../../lib/stats/DefaultStatsFactoryPlugin").StatsCompilation
	) => string;
}
