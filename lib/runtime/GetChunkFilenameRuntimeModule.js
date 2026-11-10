/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const Template = require("../template/Template");
const { reEncodeDigest } = require("../template/TemplatedPathPlugin");
const { first } = require("../util/SetHelpers");
const {
	escapeFilenameForUrl,
	toFilenameSafeName,
	toJsStringLiteral
} = require("../util/identifier");
const RuntimeGlobals = require("./RuntimeGlobals");
const RuntimeModule = require("./RuntimeModule");

/** @import Chunk, { ChunkId, ChunkFilenameTemplate } from "../graph/Chunk" */
/** @import ChunkGraph from "../graph/ChunkGraph" */
/**
 * @import Compilation, {
 * 	HashWithLengthFunction,
 * 	HashWithDigestFunction
 * } from "../Compilation"
 */

// WHY: these loaders fetch a chunk by URL, which reads `%` as an escape, so its filename
// needs `%25` there; `require` and `async-node` read a file path as written, and a loader
// added by a plugin keeps the filename it always got. Stylesheets are always fetched by URL.
const URL_CHUNK_LOADING = new Set(["jsonp", "import-scripts", "import"]);

class GetChunkFilenameRuntimeModule extends RuntimeModule {
	/**
	 * Returns true, if the runtime module should get it's own scope.
	 * When false, `generate()` must emit complete statements ending with `;`
	 * so a following runtime IIFE is not parsed as a call (ASI).
	 * @returns {boolean} true, if the runtime module should get it's own scope
	 */
	shouldIsolate() {
		return false;
	}

	/**
	 * @param {string} contentType the contentType to use the content hash for
	 * @param {string} name kind of filename
	 * @param {string} global function name to be assigned
	 * @param {(chunk: Chunk) => ChunkFilenameTemplate | false} getFilenameForChunk functor to get the filename or function
	 * @param {boolean} allChunks when false, only async chunks are included
	 * @param {boolean=} usesFullHashDigest the filename uses `[fullhash:<digest>]`/`[hash:<digest>]`, so the re-encoded full hash must be inlined (post-hash) instead of read from the runtime `getFullHash()` expression
	 */
	constructor(
		contentType,
		name,
		global,
		getFilenameForChunk,
		allChunks,
		usesFullHashDigest
	) {
		super(`get ${name} chunk filename`);
		/** @type {string} */
		this.contentType = contentType;
		/** @type {string} */
		this.global = global;
		/** @type {(chunk: Chunk) => ChunkFilenameTemplate | false} */
		this.getFilenameForChunk = getFilenameForChunk;
		/** @type {boolean} */
		this.allChunks = allChunks;
		// An inline digest on `[fullhash]` needs the final hash inlined, so this
		// module must re-render after hashing (`fullHash`); otherwise it only needs
		// the referenced chunk hashes, available before the full hash (`dependentHash`).
		if (usesFullHashDigest) {
			/** @type {boolean} */
			this.fullHash = true;
		} else {
			/** @type {boolean} */
			this.dependentHash = true;
		}
	}

	/**
	 * The `[handlerMap, key]` pairs this module installs onto a chunk handler map
	 * such as `__webpack_require__.f`, or `null` where it cannot name them.
	 * @returns {[string, string][] | null} installed chunk handlers (do not mutate)
	 */
	getInstalledChunkHandlers() {
		return RuntimeModule.NO_CHUNK_HANDLERS;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const { global, contentType, getFilenameForChunk, allChunks } = this;
		const compilation = /** @type {Compilation} */ (this.compilation);
		const chunkGraph = /** @type {ChunkGraph} */ (this.chunkGraph);
		const chunk = /** @type {Chunk} */ (this.chunk);
		const { runtimeTemplate } = compilation;
		// Digest the stored hashes are encoded in, for re-encoding `[<hash>:<digest>]`.
		const sourceDigest = compilation.outputOptions.hashDigest;
		const entryOptions = chunk.getEntryOptions();
		const chunkLoading =
			entryOptions && entryOptions.chunkLoading !== undefined
				? entryOptions.chunkLoading
				: compilation.outputOptions.chunkLoading;
		const loadsByUrl =
			contentType === "css" ||
			(typeof chunkLoading === "string" && URL_CHUNK_LOADING.has(chunkLoading));

		/**
		 * @template {ChunkId | string} T
		 * @param {T} value a filename template, chunk name or chunk id
		 * @returns {T} the value as it goes into a URL when chunks load by URL
		 */
		const forUrl = (value) =>
			loadsByUrl && typeof value === "string"
				? /** @type {T} */ (escapeFilenameForUrl(value))
				: value;

		/**
		 * Re-encodes a full hash digest into the requested digest, optionally truncated.
		 * @param {string} value full hash digest
		 * @param {string} digest requested digest
		 * @param {number=} length requested length
		 * @returns {string} re-encoded hash
		 */
		const reEncode = (value, digest, length) => {
			const hash = reEncodeDigest(value, sourceDigest, digest);
			return length ? hash.slice(0, length) : hash;
		};

		// A digest cannot be re-encoded from the runtime `getFullHash()` expression,
		// so this module is flagged `fullHash` and re-rendered after hashing: the
		// inlined value is byte-identical to the statically emitted file.
		/** @type {HashWithDigestFunction} */
		const fullHashWithDigest = (digest, length) => {
			const fullHash = compilation.fullHash;
			// Pre-hash pass (hash not computed yet): a placeholder, replaced on the
			// post-hash re-render. Matches `GetFullHashRuntimeModule`'s `|| "XXXX"`.
			if (!fullHash) return length ? "x".repeat(length) : "x";
			return JSON.stringify(reEncode(fullHash, digest, length)).slice(1, -1);
		};

		/** @type {Map<ChunkFilenameTemplate, Set<Chunk>>} */
		const chunkFilenames = new Map();
		let maxChunks = 0;
		/** @type {string | undefined} */
		let dynamicFilename;

		/**
		 * @param {Chunk} c the chunk
		 * @returns {void}
		 */
		const addChunk = (c) => {
			const chunkFilename = getFilenameForChunk(c);
			if (chunkFilename) {
				let set = chunkFilenames.get(chunkFilename);
				if (set === undefined) {
					chunkFilenames.set(chunkFilename, (set = new Set()));
				}
				set.add(c);
				if (typeof chunkFilename === "string") {
					if (set.size < maxChunks) return;
					if (set.size === maxChunks) {
						if (
							chunkFilename.length <
							/** @type {string} */ (dynamicFilename).length
						) {
							return;
						}

						if (
							chunkFilename.length ===
								/** @type {string} */ (dynamicFilename).length &&
							chunkFilename < /** @type {string} */ (dynamicFilename)
						) {
							return;
						}
					}
					maxChunks = set.size;
					dynamicFilename = chunkFilename;
				}
			}
		};

		/** @type {string[]} */
		const includedChunksMessages = [];
		if (allChunks) {
			includedChunksMessages.push("all chunks");
			for (const c of chunk.getAllReferencedChunks()) {
				addChunk(c);
			}
		} else {
			includedChunksMessages.push("async chunks");
			for (const c of chunk.getAllAsyncChunks()) {
				addChunk(c);
			}
			const includeEntries = chunkGraph
				.getTreeRuntimeRequirements(chunk)
				.has(RuntimeGlobals.ensureChunkIncludeEntries);
			if (includeEntries) {
				includedChunksMessages.push("chunks that the entrypoint depends on");
				for (const c of chunkGraph.getRuntimeChunkDependentChunksIterable(
					chunk
				)) {
					addChunk(c);
				}
			}
		}
		for (const entrypoint of chunk.getAllReferencedAsyncEntrypoints()) {
			addChunk(entrypoint.chunks[entrypoint.chunks.length - 1]);
		}

		/** @type {Map<string, Set<string | number | null>>} */
		const staticUrls = new Map();
		/** @type {Set<Chunk>} */
		const dynamicUrlChunks = new Set();

		/**
		 * Drops the dead empty string a leading placeholder leaves, only when a
		 * quoted operand ends the expression so the `+` chain stays a string.
		 * @param {string} expr concatenation expression
		 * @returns {string} the expression without its dead empty string
		 */
		const dropDeadConcatOperand = (expr) =>
			expr.startsWith('"" + ') && expr.endsWith('"') ? expr.slice(5) : expr;

		/**
		 * @param {Chunk} c the chunk
		 * @param {ChunkFilenameTemplate} chunkFilename the filename template for the chunk
		 * @returns {void}
		 */
		const addStaticUrl = (c, chunkFilename) => {
			/**
			 * @param {ChunkId} value a value
			 * @returns {string} string to put in quotes
			 */
			const unquotedStringify = (value) => {
				const str = `${value}`;
				if (str.length >= 5 && str === `${c.id}`) {
					// This is shorter and generates the same result
					return '" + chunkId + "';
				}
				const s = toJsStringLiteral(str);
				return s.slice(1, -1);
			};
			/**
			 * @param {string} value string
			 * @returns {HashWithLengthFunction} string to put in quotes with length
			 */
			const unquotedStringifyWithLength = (value) => (length) =>
				unquotedStringify(`${value}`.slice(0, length));
			const chunkFilenameValue = JSON.stringify(
				forUrl(
					typeof chunkFilename === "function"
						? chunkFilename({
								chunk: c,
								contentHashType: contentType
							})
						: chunkFilename
				)
			);
			const staticChunkFilename = compilation.getPath(chunkFilenameValue, {
				hash: `" + ${RuntimeGlobals.getFullHash}() + "`,
				hashWithLength: (length) =>
					`" + ${RuntimeGlobals.getFullHash}().slice(0, ${length}) + "`,
				hashWithDigest: fullHashWithDigest,
				chunk: {
					id: unquotedStringify(forUrl(/** @type {ChunkId} */ (c.id))),
					hash: unquotedStringify(/** @type {string} */ (c.renderedHash)),
					hashWithLength: unquotedStringifyWithLength(
						/** @type {string} */ (c.renderedHash)
					),
					hashWithDigest: (digest, length) =>
						unquotedStringify(
							reEncode(/** @type {string} */ (c.hash), digest, length)
						),
					name: unquotedStringify(
						forUrl(
							c.name
								? toFilenameSafeName(c.name)
								: /** @type {ChunkId} */ (c.id)
						)
					),
					contentHash: {
						[contentType]: unquotedStringify(c.contentHash[contentType])
					},
					contentHashWithLength: {
						[contentType]: unquotedStringifyWithLength(
							c.contentHash[contentType]
						)
					},
					contentHashWithDigest: {
						[contentType]: (digest, length) =>
							unquotedStringify(
								reEncode(
									c.contentHashFull[contentType] || c.contentHash[contentType],
									digest,
									length
								)
							)
					}
				},
				contentHashType: contentType
			});
			const url = dropDeadConcatOperand(staticChunkFilename);
			let set = staticUrls.get(url);
			if (set === undefined) {
				staticUrls.set(url, (set = new Set()));
			}
			set.add(c.id);
		};

		for (const [filename, chunks] of chunkFilenames) {
			if (filename !== dynamicFilename) {
				for (const c of chunks) addStaticUrl(c, filename);
			} else {
				for (const c of chunks) dynamicUrlChunks.add(c);
			}
		}

		/**
		 * @param {(chunk: Chunk) => string | number} fn function from chunk to value
		 * @returns {string} code with static mapping of results of fn
		 */
		const createMap = (fn) => {
			/** @type {Record<ChunkId, ChunkId>} */
			const obj = {};
			let useId = false;
			/** @type {ChunkId | undefined} */
			let lastKey;
			let entries = 0;
			for (const c of dynamicUrlChunks) {
				const value = fn(c);
				if (value === c.id) {
					useId = true;
				} else {
					obj[/** @type {ChunkId} */ (c.id)] = value;
					lastKey = /** @type {ChunkId} */ (c.id);
					entries++;
				}
			}
			if (entries === 0) return "chunkId";
			if (entries === 1) {
				return useId
					? `(chunkId === ${toJsStringLiteral(lastKey)} ? ${toJsStringLiteral(
							obj[/** @type {ChunkId} */ (lastKey)]
						)} : chunkId)`
					: toJsStringLiteral(obj[/** @type {ChunkId} */ (lastKey)]);
			}
			return useId
				? `(${toJsStringLiteral(obj)}[chunkId] || chunkId)`
				: `${toJsStringLiteral(obj)}[chunkId]`;
		};

		/**
		 * @param {(chunk: Chunk) => string | number} fn function from chunk to value
		 * @returns {string} code with static mapping of results of fn for including in quoted string
		 */
		const mapExpr = (fn) => `" + ${createMap(fn)} + "`;

		/**
		 * @param {(chunk: Chunk) => string | number} fn function from chunk to value
		 * @returns {HashWithLengthFunction} function which generates code with static mapping of results of fn for including in quoted string for specific length
		 */
		const mapExprWithLength = (fn) => (length) =>
			`" + ${createMap((c) => `${fn(c)}`.slice(0, length))} + "`;

		const dynamicUrl =
			dynamicFilename &&
			compilation.getPath(JSON.stringify(forUrl(dynamicFilename)), {
				hash: `" + ${RuntimeGlobals.getFullHash}() + "`,
				hashWithLength: (length) =>
					`" + ${RuntimeGlobals.getFullHash}().slice(0, ${length}) + "`,
				hashWithDigest: fullHashWithDigest,
				chunk: {
					id: mapExpr((c) => forUrl(/** @type {ChunkId} */ (c.id))),
					hash: mapExpr((c) => /** @type {string} */ (c.renderedHash)),
					hashWithLength: mapExprWithLength(
						(c) => /** @type {string} */ (c.renderedHash)
					),
					hashWithDigest: (digest, length) =>
						mapExpr((c) =>
							reEncode(/** @type {string} */ (c.hash), digest, length)
						),
					name: mapExpr((c) =>
						forUrl(
							c.name
								? toFilenameSafeName(c.name)
								: /** @type {ChunkId} */ (c.id)
						)
					),
					contentHash: {
						[contentType]: mapExpr((c) => c.contentHash[contentType])
					},
					contentHashWithLength: {
						[contentType]: mapExprWithLength((c) => c.contentHash[contentType])
					},
					contentHashWithDigest: {
						[contentType]: (digest, length) =>
							mapExpr((c) =>
								reEncode(
									c.contentHashFull[contentType] || c.contentHash[contentType],
									digest,
									length
								)
							)
					}
				},
				contentHashType: contentType
			});
		const url = dynamicUrl && dropDeadConcatOperand(dynamicUrl);

		const comment = `// This function allow to reference ${includedChunksMessages.join(
			" and "
		)}`;
		// Nothing to branch on, so the whole function is the template expression.
		if (staticUrls.size === 0) {
			return Template.asString([
				comment,
				// `url` is `undefined` when no chunk contributes a filename; the
				// function then returns `undefined`, as it did before.
				`${global} = ${runtimeTemplate.returningFunction(`${url}`, "chunkId")};`
			]);
		}
		return Template.asString([
			comment,
			`${global} = ${runtimeTemplate.basicFunction("chunkId", [
				"// return url for filenames not based on template",
				// it minimizes to `x===1?"...":x===2?"...":"..."`
				Template.asString(
					Array.from(staticUrls, ([url, ids]) => {
						const condition =
							ids.size === 1
								? `chunkId === ${toJsStringLiteral(first(ids))}`
								: `{${Array.from(
										ids,
										(id) => `${toJsStringLiteral(id)}:1`
									).join(",")}}[chunkId]`;
						return `if (${condition}) return ${url};`;
					})
				),
				"// return url for filenames based on template",
				`return ${url};`
			])};`
		]);
	}
}

module.exports = GetChunkFilenameRuntimeModule;
