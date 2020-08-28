/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { RawSource, CachedSource, CompatSource } = require("webpack-sources");
const Compilation = require("../Compilation");
const { compareSelect, compareStrings } = require("../util/comparators");
const createHash = require("../util/createHash");

/** @typedef {import("../Compiler")} Compiler */

const EMPTY_SET = new Set();

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

const cachedSourceMap = new WeakMap();

const toCachedSource = source => {
	if (source instanceof CachedSource) {
		return source;
	}
	const entry = cachedSourceMap.get(source);
	if (entry !== undefined) return entry;
	const newSource = new CachedSource(CompatSource.from(source));
	cachedSourceMap.set(source, newSource);
	return newSource;
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
			const cacheAnalyse = compilation.getCache(
				"RealContentHashPlugin|analyse"
			);
			const cacheGenerate = compilation.getCache(
				"RealContentHashPlugin|generate"
			);
			compilation.hooks.processAssets.tapPromise(
				{
					name: "RealContentHashPlugin",
					stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_HASH
				},
				async () => {
					const assets = compilation.getAssets();
					const assetsWithInfo = [];
					const hashToAssets = new Map();
					for (const { source, info, name } of assets) {
						const cachedSource = toCachedSource(source);
						const content = cachedSource.source();
						/** @type {Set<string>} */
						const hashes = new Set();
						addToList(info.contenthash, hashes);
						const data = {
							name,
							info,
							source: cachedSource,
							/** @type {RawSource | undefined} */
							newSource: undefined,
							content,
							hasOwnHash: false,
							contentComputePromise: false,
							/** @type {Set<string>} */
							referencedHashes: undefined,
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
					if (hashToAssets.size === 0) return;
					const hashRegExp = new RegExp(
						Array.from(hashToAssets.keys(), quoteMeta).join("|"),
						"g"
					);
					await Promise.all(
						assetsWithInfo.map(async asset => {
							const { name, source, content, hashes } = asset;
							if (Buffer.isBuffer(content)) {
								asset.referencedHashes = EMPTY_SET;
								return;
							}
							const etag = cacheAnalyse.mergeEtags(
								cacheAnalyse.getLazyHashedEtag(source),
								Array.from(hashes).join("|")
							);
							asset.referencedHashes = await cacheAnalyse.providePromise(
								name,
								etag,
								() => {
									const referencedHashes = new Set();
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
									return referencedHashes;
								}
							);
						})
					);
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
						if (asset.contentComputePromise) return asset.contentComputePromise;
						return (asset.contentComputePromise = (async () => {
							if (
								asset.hasOwnHash ||
								Array.from(asset.referencedHashes).some(
									hash => hashToNewHash.get(hash) !== hash
								)
							) {
								const identifier =
									asset.name +
									(includeOwn && asset.hasOwnHash ? "|with-own" : "");
								const etag = cacheGenerate.mergeEtags(
									cacheGenerate.getLazyHashedEtag(asset.source),
									Array.from(asset.referencedHashes, hash =>
										hashToNewHash.get(hash)
									).join("|")
								);
								asset.newSource = await cacheGenerate.providePromise(
									identifier,
									etag,
									() => {
										const newContent = asset.content.replace(
											hashRegExp,
											hash => {
												if (!includeOwn && asset.hashes.has(hash)) {
													return "";
												}
												return hashToNewHash.get(hash);
											}
										);
										return new RawSource(newContent);
									}
								);
							}
						})());
					};
					const comparator = compareSelect(a => a.name, compareStrings);
					for (const oldHash of hashesInOrder) {
						const assets = hashToAssets.get(oldHash);
						assets.sort(comparator);
						const hash = createHash(this._hashFunction);
						await Promise.all(assets.map(computeNewContent));
						for (const asset of assets) {
							hash.update(
								asset.newSource
									? asset.newSource.buffer()
									: asset.source.buffer()
							);
						}
						const digest = hash.digest(this._hashDigest);
						const newHash = digest.slice(0, oldHash.length);
						hashToNewHash.set(oldHash, newHash);
					}
					await Promise.all(
						assetsWithInfo.map(async asset => {
							// recomputed content with it's own hash
							if (asset.hasOwnHash) {
								asset.contentComputePromise = undefined;
							}
							await computeNewContent(asset, true);
							const newName = asset.name.replace(hashRegExp, hash =>
								hashToNewHash.get(hash)
							);

							const infoUpdate = {};
							const hash = asset.info.contenthash;
							infoUpdate.contenthash = Array.isArray(hash)
								? hash.map(hash => hashToNewHash.get(hash))
								: hashToNewHash.get(hash);

							if (asset.newSource !== undefined) {
								compilation.updateAsset(
									asset.name,
									asset.newSource,
									infoUpdate
								);
							} else {
								compilation.updateAsset(asset.name, asset.source, infoUpdate);
							}

							if (asset.name !== newName) {
								compilation.renameAsset(asset.name, newName);
							}
						})
					);
				}
			);
		});
	}
}

module.exports = RealContentHashPlugin;
