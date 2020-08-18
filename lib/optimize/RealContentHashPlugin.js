/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { RawSource } = require("webpack-sources");
const Compilation = require("../Compilation");
const { compareSelect, compareStrings } = require("../util/comparators");
const createHash = require("../util/createHash");

/** @typedef {import("../Compiler")} Compiler */

const addToList = (itemOrItems, list) => {
	if (Array.isArray(itemOrItems)) {
		for (const item of itemOrItems) {
			list.add(item);
		}
	} else if (itemOrItems) {
		list.add(itemOrItems);
	}
};

/**
 * Escapes regular expression metacharacters
 * @param {string} str String to quote
 * @returns {string} Escaped string
 */
const quoteMeta = str => {
	return str.replace(/[-[\]\\/{}()*+?.^$|]/g, "\\$&");
};

class RealContentHashPlugin {
	constructor({ hashFunction, hashDigest }) {
		this._hashFunction = hashFunction;
		this._hashDigest = hashDigest;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("RealContentHashPlugin", compilation => {
			compilation.hooks.processAssets.tap(
				{
					name: "RealContentHashPlugin",
					stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_HASH
				},
				() => {
					const assets = compilation.getAssets();
					const assetsWithInfo = [];
					const hashToAssets = new Map();
					for (const { source, info, name } of assets) {
						const content = source.source();
						/** @type {Set<string>} */
						const hashes = new Set();
						addToList(info.contenthash, hashes);
						const data = {
							name,
							info,
							source,
							content,
							newContent: undefined,
							hasOwnHash: false,
							contentHash: undefined,
							referencedHashes: new Set(),
							hashes
						};
						assetsWithInfo.push(data);
						for (const hash of hashes) {
							const list = hashToAssets.get(hash);
							if (list === undefined) {
								hashToAssets.set(hash, [data]);
							} else {
								list.push(data);
							}
						}
					}
					const hashRegExp = new RegExp(
						Array.from(hashToAssets.keys(), quoteMeta).join("|"),
						"g"
					);
					for (const asset of assetsWithInfo) {
						const { content, referencedHashes, hashes } = asset;
						if (Buffer.isBuffer(content)) continue;
						const inContent = content.match(hashRegExp);
						if (inContent) {
							for (const hash of inContent) {
								if (hashes.has(hash)) {
									asset.hasOwnHash = true;
									continue;
								}
								referencedHashes.add(hash);
							}
						}
					}
					const getDependencies = hash => {
						const assets = hashToAssets.get(hash);
						const hashes = new Set();
						for (const { referencedHashes } of assets) {
							for (const hash of referencedHashes) {
								hashes.add(hash);
							}
						}
						return hashes;
					};
					const hashInfo = hash => {
						const assets = hashToAssets.get(hash);
						return `${hash} (${Array.from(assets, a => a.name)})`;
					};
					const hashesInOrder = new Set();
					for (const hash of hashToAssets.keys()) {
						const add = (hash, stack) => {
							const deps = getDependencies(hash);
							stack.add(hash);
							for (const dep of deps) {
								if (hashesInOrder.has(dep)) continue;
								if (stack.has(dep)) {
									throw new Error(
										`Circular hash dependency ${Array.from(
											stack,
											hashInfo
										).join(" -> ")} -> ${hashInfo(dep)}`
									);
								}
								add(dep, stack);
							}
							hashesInOrder.add(hash);
							stack.delete(hash);
						};
						if (hashesInOrder.has(hash)) continue;
						add(hash, new Set());
					}
					const hashToNewHash = new Map();
					const computeNewContent = (asset, includeOwn) => {
						if (asset.newContent !== undefined) return;
						if (
							asset.hasOwnHash ||
							Array.from(asset.referencedHashes).some(hash =>
								hashToNewHash.has(hash)
							)
						) {
							asset.newContent = asset.content.replace(hashRegExp, hash => {
								if (!includeOwn && asset.hashes.has(hash)) {
									return "";
								}
								return hashToNewHash.get(hash) || hash;
							});
						}
					};
					const comparator = compareSelect(a => a.name, compareStrings);
					for (const oldHash of hashesInOrder) {
						const assets = hashToAssets.get(oldHash);
						assets.sort(comparator);
						const hash = createHash(this._hashFunction);
						for (const asset of assets) {
							computeNewContent(asset);
							hash.update(asset.newContent || asset.content);
						}
						const digest = hash.digest(this._hashDigest);
						const newHash = digest.slice(0, oldHash.length);
						if (oldHash !== newHash) {
							hashToNewHash.set(oldHash, newHash);
						}
					}
					for (const asset of assetsWithInfo) {
						// recomputed content with it's own hash
						if (asset.hasOwnHash) {
							asset.newContent = undefined;
							computeNewContent(asset, true);
						}
						const newName = asset.name.replace(
							hashRegExp,
							hash => hashToNewHash.get(hash) || hash
						);

						const infoUpdate = {};
						const hash = asset.info.contenthash;
						infoUpdate.contenthash = Array.isArray(hash)
							? hash.map(hash => hashToNewHash.get(hash) || hash)
							: hashToNewHash.get(hash) || hash;

						if (asset.newContent !== undefined) {
							const source = new RawSource(asset.newContent);
							compilation.updateAsset(asset.name, source, infoUpdate);
						} else {
							compilation.updateAsset(asset.name, asset.source, infoUpdate);
						}

						if (asset.name !== newName) {
							compilation.renameAsset(asset.name, newName);
						}
					}
				}
			);
		});
	}
}

module.exports = RealContentHashPlugin;
