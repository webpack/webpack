/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compilation")} Compilation */

/**
 * @typedef {object} AssetInfo
 * @property {string} url
 * @property {string} as
 * @property {string=} fetchPriority
 * @property {string=} type
 */

/**
 * @typedef {object} AssetPrefetchInfo
 * @property {AssetInfo[]} prefetch
 * @property {AssetInfo[]} preload
 */

class AssetPrefetchStartupRuntimeModule extends RuntimeModule {
	/**
	 * @param {AssetPrefetchInfo} assetInfo asset prefetch/preload information
	 */
	constructor(assetInfo) {
		super("asset prefetch", RuntimeModule.STAGE_TRIGGER);
		this.assetInfo = assetInfo;
	}

	/**
	 * @returns {string | null} runtime code
	 */
	generate() {
		const { assetInfo } = this;
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;

		const lines = [];

		// Helper to serialize asset info
		/**
		 * @param {AssetInfo} asset The asset information to serialize
		 * @returns {string} Serialized arguments for prefetch/preload function
		 */
		const serializeAsset = (asset) => {
			const args = [
				`${RuntimeGlobals.publicPath} + "${asset.url}"`,
				`"${asset.as}"`
			];

			if (asset.fetchPriority) {
				args.push(`"${asset.fetchPriority}"`);
			} else {
				args.push("undefined");
			}

			if (asset.type) {
				args.push(`"${asset.type}"`);
			}

			return args.join(", ");
		};

		// Generate prefetch code
		if (assetInfo.prefetch.length > 0) {
			const prefetchCode =
				assetInfo.prefetch.length <= 2
					? // For few assets, generate direct calls
						assetInfo.prefetch.map(
							(asset) =>
								`${RuntimeGlobals.prefetchAsset}(${serializeAsset(asset)});`
						)
					: // For many assets, use array iteration
						Template.asString([
							`[${assetInfo.prefetch
								.map(
									(asset) =>
										`{ url: ${RuntimeGlobals.publicPath} + "${asset.url}", as: "${asset.as}"${
											asset.fetchPriority
												? `, fetchPriority: "${asset.fetchPriority}"`
												: ""
										}${asset.type ? `, type: "${asset.type}"` : ""} }`
								)
								.join(", ")}].forEach(${runtimeTemplate.basicFunction("asset", [
								`${RuntimeGlobals.prefetchAsset}(asset.url, asset.as, asset.fetchPriority, asset.type);`
							])});`
						]);

			if (Array.isArray(prefetchCode)) {
				lines.push(...prefetchCode);
			} else {
				lines.push(prefetchCode);
			}
		}

		// Generate preload code with higher priority
		if (assetInfo.preload.length > 0) {
			const preloadCode =
				assetInfo.preload.length <= 2
					? // For few assets, generate direct calls
						assetInfo.preload.map(
							(asset) =>
								`${RuntimeGlobals.preloadAsset}(${serializeAsset(asset)});`
						)
					: // For many assets, use array iteration
						Template.asString([
							`[${assetInfo.preload
								.map(
									(asset) =>
										`{ url: ${RuntimeGlobals.publicPath} + "${asset.url}", as: "${asset.as}"${
											asset.fetchPriority
												? `, fetchPriority: "${asset.fetchPriority}"`
												: ""
										}${asset.type ? `, type: "${asset.type}"` : ""} }`
								)
								.join(", ")}].forEach(${runtimeTemplate.basicFunction("asset", [
								`${RuntimeGlobals.preloadAsset}(asset.url, asset.as, asset.fetchPriority, asset.type);`
							])});`
						]);

			if (Array.isArray(preloadCode)) {
				lines.push(...preloadCode);
			} else {
				lines.push(preloadCode);
			}
		}

		return Template.asString(lines);
	}
}

module.exports = AssetPrefetchStartupRuntimeModule;
