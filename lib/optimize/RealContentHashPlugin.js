/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncBailHook } = require("tapable");
const { CachedSource, CompatSource, RawSource } = require("webpack-sources");
const Compilation = require("../Compilation");
const WebpackError = require("../errors/WebpackError");
const { compareSelect, compareStrings } = require("../util/comparators");
const createHash = require("../util/createHash");

/** @typedef {import("../../declarations/WebpackOptions").HashFunction} HashFunction */
/** @typedef {import("../../declarations/WebpackOptions").HashDigest} HashDigest */
/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Cache").Etag} Etag */
/** @typedef {import("../Compilation").AssetInfo} AssetInfo */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {typeof import("../util/Hash")} Hash */

/**
 * Defines the comparator type used by this module.
 * @template T
 * @typedef {import("../util/comparators").Comparator<T>} Comparator
 */

/** @type {Hashes} */
const EMPTY_SET = new Set();

/**
 * Adds the provided item or item to this object.
 * @template T
 * @param {T | T[]} itemOrItems item or items
 * @param {Set<T>} list list
 */
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
 * Compares two non-empty buffer chunk arrays for byte-equality without
 * allocating a concatenated buffer.
 * @param {Buffer[]} a first chunk array
 * @param {Buffer[]} b second chunk array
 * @returns {boolean} true if the concatenations are byte-equal
 */
const bufferArraysEqual = (a, b) => {
	let aIdx = 0;
	let aOff = 0;
	let bIdx = 0;
	let bOff = 0;
	while (aIdx < a.length && bIdx < b.length) {
		const aBuf = a[aIdx];
		const bBuf = b[bIdx];
		const len = Math.min(aBuf.length - aOff, bBuf.length - bOff);
		if (aBuf.compare(bBuf, bOff, bOff + len, aOff, aOff + len) !== 0) {
			return false;
		}
		aOff += len;
		bOff += len;
		if (aOff === aBuf.length) {
			aIdx++;
			aOff = 0;
		}
		if (bOff === bBuf.length) {
			bIdx++;
			bOff = 0;
		}
	}
	return aIdx === a.length && bIdx === b.length;
};

/**
 * Map sources to their buffer chunks and deduplicate by total byte content,
 * grouping by total length first to avoid full comparisons.
 * @template T
 * @param {T[]} input list
 * @param {(item: T) => Source} fn map function returning a Source
 * @returns {Buffer[][]} unique chunk arrays
 */
const mapAndDeduplicateSourceBuffers = (input, fn) => {
	/** @type {Map<number, Buffer[][]>} */
	const bySize = new Map();
	/** @type {Buffer[][]} */
	const result = [];
	for (const value of input) {
		const source = fn(value);
		// TODO webpack 6: drop the `buffers` check, require webpack-sources >= 3.4
		// and call `source.buffers()` unconditionally.
		const chunks =
			// TODO remove in webpack 6, this is protection against authors who directly use `webpack-sources` outdated version
			typeof source.buffers === "function"
				? source.buffers()
				: [source.buffer()];
		let total = 0;
		for (const c of chunks) total += c.length;
		const sameSize = bySize.get(total);
		if (sameSize) {
			let duplicate = false;
			for (const other of sameSize) {
				if (bufferArraysEqual(chunks, other)) {
					duplicate = true;
					break;
				}
			}
			if (duplicate) continue;
			sameSize.push(chunks);
		} else {
			bySize.set(total, [chunks]);
		}
		result.push(chunks);
	}
	return result;
};

/**
 * Escapes regular expression metacharacters
 * @param {string} str String to quote
 * @returns {string} Escaped string
 */
const quoteMeta = (str) => str.replace(/[-[\]\\/{}()*+?.^$|]/g, "\\$&");

/** @type {WeakMap<Source, CachedSource>} */
const cachedSourceMap = new WeakMap();

/**
 * Returns cached source.
 * @param {Source} source source
 * @returns {CachedSource} cached source
 */
const toCachedSource = (source) => {
	if (source instanceof CachedSource) {
		return source;
	}
	const entry = cachedSourceMap.get(source);
	if (entry !== undefined) return entry;
	const newSource = new CachedSource(CompatSource.from(source));
	cachedSourceMap.set(source, newSource);
	return newSource;
};

/** @typedef {Set<string>} Hashes */

/**
 * Defines the asset info for real content hash type used by this module.
 * @typedef {object} AssetInfoForRealContentHash
 * @property {string} name
 * @property {AssetInfo} info
 * @property {Source} source
 * @property {RawSource | undefined} newSource
 * @property {RawSource | undefined} newSourceWithoutOwn
 * @property {string} content
 * @property {Hashes | undefined} ownHashes
 * @property {Promise<void> | undefined} contentComputePromise
 * @property {Promise<void> | undefined} contentComputeWithoutOwnPromise
 * @property {Hashes | undefined} referencedHashes
 * @property {Hashes} hashes
 */

/**
 * Defines the compilation hooks type used by this module.
 * @typedef {object} CompilationHooks
 * @property {SyncBailHook<[Buffer[], string], string | void>} updateHash
 */

/** @type {WeakMap<Compilation, CompilationHooks>} */
const compilationHooksMap = new WeakMap();

/**
 * Defines the real content hash plugin options type used by this module.
 * @typedef {object} RealContentHashPluginOptions
 * @property {HashFunction} hashFunction the hash function to use
 * @property {HashDigest} hashDigest the hash digest to use
 */

const PLUGIN_NAME = "RealContentHashPlugin";

class RealContentHashPlugin {
	/**
	 * Returns the attached hooks.
	 * @param {Compilation} compilation the compilation
	 * @returns {CompilationHooks} the attached hooks
	 */
	static getCompilationHooks(compilation) {
		if (!(compilation instanceof Compilation)) {
			throw new TypeError(
				"The 'compilation' argument must be an instance of Compilation"
			);
		}
		let hooks = compilationHooksMap.get(compilation);
		if (hooks === undefined) {
			hooks = {
				updateHash: new SyncBailHook(["content", "oldHash"])
			};
			compilationHooksMap.set(compilation, hooks);
		}
		return hooks;
	}

	/**
	 * Creates an instance of RealContentHashPlugin.
	 * @param {RealContentHashPluginOptions} options options
	 */
	constructor({ hashFunction, hashDigest }) {
		/** @type {HashFunction} */
		this._hashFunction = hashFunction;
		/** @type {HashDigest} */
		this._hashDigest = hashDigest;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			const cacheAnalyse = compilation.getCache(
				"RealContentHashPlugin|analyse"
			);
			const cacheGenerate = compilation.getCache(
				"RealContentHashPlugin|generate"
			);
			const hooks = RealContentHashPlugin.getCompilationHooks(compilation);
			compilation.hooks.processAssets.tapPromise(
				{
					name: PLUGIN_NAME,
					stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_HASH
				},
				async () => {
					const assets = compilation.getAssets();
					/** @type {AssetInfoForRealContentHash[]} */
					const assetsWithInfo = [];
					/** @type {Map<string, [AssetInfoForRealContentHash]>} */
					const hashToAssets = new Map();
					for (const { source, info, name } of assets) {
						const cachedSource = toCachedSource(source);
						const content = /** @type {string} */ (cachedSource.source());
						/** @type {Hashes} */
						const hashes = new Set();
						addToList(info.contenthash, hashes);
						/** @type {AssetInfoForRealContentHash} */
						const data = {
							name,
							info,
							source: cachedSource,
							newSource: undefined,
							newSourceWithoutOwn: undefined,
							content,
							ownHashes: undefined,
							contentComputePromise: undefined,
							contentComputeWithoutOwnPromise: undefined,
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
						assetsWithInfo.map(async (asset) => {
							const { name, source, content, hashes } = asset;
							if (Buffer.isBuffer(content)) {
								asset.referencedHashes = EMPTY_SET;
								asset.ownHashes = EMPTY_SET;
								return;
							}
							const etag = cacheAnalyse.mergeEtags(
								cacheAnalyse.getLazyHashedEtag(source),
								[...hashes].join("|")
							);
							[asset.referencedHashes, asset.ownHashes] =
								await cacheAnalyse.providePromise(name, etag, () => {
									/** @type {Hashes} */
									const referencedHashes = new Set();
									/** @type {Hashes} */
									const ownHashes = new Set();
									const inContent = content.match(hashRegExp);
									if (inContent) {
										for (const hash of inContent) {
											if (hashes.has(hash)) {
												ownHashes.add(hash);
												continue;
											}
											referencedHashes.add(hash);
										}
									}
									return [referencedHashes, ownHashes];
								});
						})
					);
					/**
					 * Returns the referenced hashes.
					 * @param {string} hash the hash
					 * @returns {undefined | Hashes} the referenced hashes
					 */
					const getDependencies = (hash) => {
						const assets = hashToAssets.get(hash);
						if (!assets) {
							const referencingAssets = assetsWithInfo.filter((asset) =>
								/** @type {Hashes} */ (asset.referencedHashes).has(hash)
							);
							const err = new WebpackError(`RealContentHashPlugin
Some kind of unexpected caching problem occurred.
An asset was cached with a reference to another asset (${hash}) that's not in the compilation anymore.
Either the asset was incorrectly cached, or the referenced asset should also be restored from cache.
Referenced by:
${referencingAssets
	.map((a) => {
		const match = new RegExp(`.{0,20}${quoteMeta(hash)}.{0,20}`).exec(
			a.content
		);
		return ` - ${a.name}: ...${match ? match[0] : "???"}...`;
	})
	.join("\n")}`);
							compilation.errors.push(err);
							return;
						}
						/** @type {Hashes} */
						const hashes = new Set();
						for (const { referencedHashes, ownHashes } of assets) {
							if (!(/** @type {Hashes} */ (ownHashes).has(hash))) {
								for (const hash of /** @type {Hashes} */ (ownHashes)) {
									hashes.add(hash);
								}
							}
							for (const hash of /** @type {Hashes} */ (referencedHashes)) {
								hashes.add(hash);
							}
						}
						return hashes;
					};
					/**
					 * Returns the hash info.
					 * @param {string} hash the hash
					 * @returns {string} the hash info
					 */
					const hashInfo = (hash) => {
						const assets = hashToAssets.get(hash);
						return `${hash} (${Array.from(
							/** @type {AssetInfoForRealContentHash[]} */ (assets),
							(a) => a.name
						)})`;
					};
					/** @type {Hashes} */
					const hashesInOrder = new Set();
					for (const hash of hashToAssets.keys()) {
						/**
						 * Processes the provided hash.
						 * @param {string} hash the hash
						 * @param {Set<string>} stack stack of hashes
						 */
						const add = (hash, stack) => {
							const deps = getDependencies(hash);
							if (!deps) return;
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
					/** @type {Map<string, string>} */
					const hashToNewHash = new Map();
					/**
					 * Returns etag.
					 * @param {AssetInfoForRealContentHash} asset asset info
					 * @returns {Etag} etag
					 */
					const getEtag = (asset) =>
						cacheGenerate.mergeEtags(
							cacheGenerate.getLazyHashedEtag(asset.source),
							Array.from(
								/** @type {Hashes} */ (asset.referencedHashes),
								(hash) => hashToNewHash.get(hash)
							).join("|")
						);
					/**
					 * Compute new content.
					 * @param {AssetInfoForRealContentHash} asset asset info
					 * @returns {Promise<void>}
					 */
					const computeNewContent = (asset) => {
						if (asset.contentComputePromise) return asset.contentComputePromise;
						return (asset.contentComputePromise = (async () => {
							if (
								/** @type {Hashes} */ (asset.ownHashes).size > 0 ||
								[.../** @type {Hashes} */ (asset.referencedHashes)].some(
									(hash) => hashToNewHash.get(hash) !== hash
								)
							) {
								const identifier = asset.name;
								const etag = getEtag(asset);
								asset.newSource = await cacheGenerate.providePromise(
									identifier,
									etag,
									() => {
										const newContent = asset.content.replace(
											hashRegExp,
											(hash) => /** @type {string} */ (hashToNewHash.get(hash))
										);
										return new RawSource(newContent);
									}
								);
							}
						})());
					};
					/**
					 * Compute new content without own.
					 * @param {AssetInfoForRealContentHash} asset asset info
					 * @returns {Promise<void>}
					 */
					const computeNewContentWithoutOwn = (asset) => {
						if (asset.contentComputeWithoutOwnPromise) {
							return asset.contentComputeWithoutOwnPromise;
						}
						return (asset.contentComputeWithoutOwnPromise = (async () => {
							if (
								/** @type {Hashes} */ (asset.ownHashes).size > 0 ||
								[.../** @type {Hashes} */ (asset.referencedHashes)].some(
									(hash) => hashToNewHash.get(hash) !== hash
								)
							) {
								const identifier = `${asset.name}|without-own`;
								const etag = getEtag(asset);
								asset.newSourceWithoutOwn = await cacheGenerate.providePromise(
									identifier,
									etag,
									() => {
										const newContent = asset.content.replace(
											hashRegExp,
											(hash) => {
												if (
													/** @type {Hashes} */
													(asset.ownHashes).has(hash)
												) {
													return "";
												}
												return /** @type {string} */ (hashToNewHash.get(hash));
											}
										);
										return new RawSource(newContent);
									}
								);
							}
						})());
					};
					/** @type {Comparator<AssetInfoForRealContentHash>} */
					const comparator = compareSelect((a) => a.name, compareStrings);
					for (const oldHash of hashesInOrder) {
						const assets =
							/** @type {AssetInfoForRealContentHash[]} */
							(hashToAssets.get(oldHash));
						assets.sort(comparator);
						await Promise.all(
							assets.map((asset) =>
								/** @type {Hashes} */ (asset.ownHashes).has(oldHash)
									? computeNewContentWithoutOwn(asset)
									: computeNewContent(asset)
							)
						);
						const uniqueChunkArrays = mapAndDeduplicateSourceBuffers(
							assets,
							(asset) => {
								if (/** @type {Hashes} */ (asset.ownHashes).has(oldHash)) {
									return asset.newSourceWithoutOwn || asset.source;
								}
								return asset.newSource || asset.source;
							}
						);
						/** @type {string | undefined} */
						let newHash;
						// Only materialize the public `Buffer[]` (one entry per unique
						// asset) when something is tapped; otherwise the hot path feeds
						// chunks into the hash directly, avoiding per-asset Buffer.concat.
						if (hooks.updateHash.isUsed()) {
							const assetsContent = uniqueChunkArrays.map((chunks) =>
								chunks.length === 1 ? chunks[0] : Buffer.concat(chunks)
							);
							newHash =
								hooks.updateHash.call(assetsContent, oldHash) || undefined;
						}
						if (!newHash) {
							const hash = createHash(this._hashFunction);
							if (compilation.outputOptions.hashSalt) {
								hash.update(compilation.outputOptions.hashSalt);
							}
							for (const chunks of uniqueChunkArrays) {
								for (const c of chunks) hash.update(c);
							}
							const digest = hash.digest(this._hashDigest);
							newHash = digest.slice(0, oldHash.length);
						}
						hashToNewHash.set(oldHash, newHash);
					}
					await Promise.all(
						assetsWithInfo.map(async (asset) => {
							await computeNewContent(asset);
							const newName = asset.name.replace(
								hashRegExp,
								(hash) => /** @type {string} */ (hashToNewHash.get(hash))
							);

							const infoUpdate = {};
							const hash =
								/** @type {Exclude<AssetInfo["contenthash"], undefined>} */
								(asset.info.contenthash);
							infoUpdate.contenthash = Array.isArray(hash)
								? hash.map(
										(hash) => /** @type {string} */ (hashToNewHash.get(hash))
									)
								: /** @type {string} */ (hashToNewHash.get(hash));

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
