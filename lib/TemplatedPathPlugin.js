/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Jason Anderson @diurnalist
*/

"use strict";

const { basename, extname } = require("path");
const util = require("util");
const Chunk = require("./Chunk");
const Module = require("./Module");
const {
	decode: decodeBase,
	encode: encodeBase
} = require("./util/hash/hash-digest");
const { parseResource } = require("./util/identifier");
const memoize = require("./util/memoize");

const getMimeTypes = memoize(() => require("./util/mimeTypes"));

/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./ChunkGraph").ModuleId} ModuleId */
/** @typedef {import("./Compilation").AssetInfo} AssetInfo */
/** @typedef {import("./Compilation").HashWithDigestFunction} HashWithDigestFunction */
/** @typedef {import("./Compilation").PathData} PathData */
/** @typedef {import("./Compilation").PathDataChunk} PathDataChunk */
/** @typedef {import("./Compilation").PathDataModule} PathDataModule */
/** @typedef {import("./Compiler")} Compiler */

const REGEXP = /\[\\*([\w:]+)\\*\]/g;

/**
 * Placeholder kinds present in a template string, cached so the scan is not
 * repeated for reused templates (e.g. `output.filename`, `localIdentName`).
 * Bounded so dynamic (function-built) paths can't grow it without limit.
 * @type {Map<string, Set<string>>}
 */
const presentKindsCache = new Map();
const PRESENT_KINDS_CACHE_MAX = 1000;

/**
 * Returns the placeholder kinds (`[kind]` / `[kind:arg]`) a template references,
 * matching the replace pass below so guarding replacer construction by it stays
 * output-identical.
 * @param {string} path template string (already known to contain `[`)
 * @returns {Set<string>} placeholder kinds present
 */
const getPresentKinds = (path) => {
	const cached = presentKindsCache.get(path);
	if (cached !== undefined) return cached;
	/** @type {Set<string>} */
	const kinds = new Set();
	// `RegExp.exec` loop rather than `String.matchAll` (Node.js 12+) so this
	// stays compatible with the supported Node.js 10 range.
	REGEXP.lastIndex = 0;
	/** @type {RegExpExecArray | null} */
	let m;
	while ((m = REGEXP.exec(path)) !== null) {
		const content = /** @type {string} */ (m[1]);
		if (content.length + 2 === m[0].length) {
			const cm = /^(\w+)(?::\w+)?(?::\w+)?$/.exec(content);
			if (cm) kinds.add(cm[1]);
		}
	}
	if (presentKindsCache.size >= PRESENT_KINDS_CACHE_MAX) {
		presentKindsCache.clear();
	}
	presentKindsCache.set(path, kinds);
	return kinds;
};

/** @type {PathData["prepareId"]} */
const prepareId = (id) => {
	if (typeof id !== "string") return id;

	if (/^"\s\+*.*\+\s*"$/.test(id)) {
		const match = /^"\s\+*\s*(.*)\s*\+\s*"$/.exec(id);

		return `" + (${
			/** @type {string[]} */ (match)[1]
		} + "").replace(/(^[.-]|[^a-zA-Z0-9_-])+/g, "_") + "`;
	}

	return id.replace(/(^[.-]|[^a-z0-9_-])+/gi, "_");
};

/**
 * Defines the replacer function callback.
 * @callback ReplacerFunction
 * @param {string} match
 * @param {string | undefined} arg
 * @param {string} input
 */

/** @typedef {"26" | "32" | "36" | "49" | "52" | "58" | "62"} Base */

// `[<digest>]` placeholders may request a digest webpack does not store the
// hash in; loader-utils calls the URL-safe base64 `base64safe`.
const BASE_DIGEST = /^base(\d+)$/;
const SUPPORTED_BASES = new Set(["26", "32", "36", "49", "52", "58", "62"]);

// Node < 14.18 lacks the `base64url` Buffer encoding; fall back to base64 + swap.
let isBase64UrlSupported = false;
try {
	isBase64UrlSupported = Boolean(Buffer.from("", "base64url"));
} catch (_err) {
	// Nothing
}

/**
 * @param {string} digest digest name from a `[<hash>:<digest>]` placeholder
 * @returns {boolean} whether a hash can be re-encoded into this digest
 */
const isSupportedDigest = (digest) => {
	if (digest === "base64url" || digest === "base64safe") return true;
	const base = BASE_DIGEST.exec(digest);
	if (base) return base[1] === "64" || SUPPORTED_BASES.has(base[1]);
	return Buffer.isEncoding(digest);
};

/**
 * Decodes an already-digested hash string back into its raw bytes.
 * @param {string} value digested hash
 * @param {string} digest digest the value is encoded in
 * @returns {Buffer} raw bytes
 */
const digestToBuffer = (value, digest) => {
	const base = BASE_DIGEST.exec(digest);
	if (base && Number(base[1]) !== 64) {
		return decodeBase(value, /** @type {Base} */ (base[1]));
	}
	if (
		(digest === "base64url" || digest === "base64safe") &&
		!isBase64UrlSupported
	) {
		return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
	}
	return Buffer.from(
		value,
		/** @type {BufferEncoding} */ (
			digest === "base64safe" ? "base64url" : digest
		)
	);
};

/**
 * Encodes raw bytes into the requested digest.
 * @param {Buffer} buffer raw bytes
 * @param {string} digest target digest
 * @returns {string} encoded hash
 */
const bufferToDigest = (buffer, digest) => {
	const base = BASE_DIGEST.exec(digest);
	if (base && Number(base[1]) !== 64) {
		return encodeBase(buffer, /** @type {Base} */ (base[1]));
	}
	if (
		(digest === "base64url" || digest === "base64safe") &&
		!isBase64UrlSupported
	) {
		return buffer
			.toString("base64")
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/[=]+$/, "");
	}
	return buffer.toString(
		/** @type {BufferEncoding} */ (
			digest === "base64safe" ? "base64url" : digest
		)
	);
};

/**
 * Re-encodes a digested hash into another digest (e.g. `[contenthash:base64]`).
 * The source is already truncated to `output.hashDigestLength`, so the result is
 * derived from those bytes, not the full content. Throws on an unknown digest so
 * a typo fails loudly rather than silently keeping the original encoding.
 * @param {string} value digested hash
 * @param {string} fromDigest digest the value is encoded in
 * @param {string} toDigest requested digest
 * @returns {string} re-encoded hash
 */
const reEncodeDigest = (value, fromDigest, toDigest) => {
	if (toDigest === fromDigest) return value;
	if (!isSupportedDigest(toDigest)) {
		throw new Error(
			`Unsupported hash digest "${toDigest}" in path template (use hex, base64, base64url, or base26/32/36/49/52/58/62)`
		);
	}
	return bufferToDigest(digestToBuffer(value, fromDigest), toDigest);
};

/**
 * Returns hash replacer function.
 * @param {ReplacerFunction} replacer replacer
 * @param {((arg0: number) => string) | undefined} handler handler
 * @param {AssetInfo | undefined} assetInfo asset info
 * @param {string} hashName hash name
 * @param {string} sourceDigest digest the stored hash is encoded in
 * @param {string=} fullValue untruncated hash, re-encoded for `[<hash>:<digest>]` so the result carries full entropy instead of the `hashDigestLength`-truncated value
 * @param {boolean=} recordDigest record the inline digest on `assetInfo.contenthashDigest` so `RealContentHashPlugin` re-encodes the recomputed hash in it
 * @param {HashWithDigestFunction=} digestHandler builds the value for `[<hash>:<digest>]` in a per-chunk runtime context (the runtime chunk-filename map), where a single re-encode of the whole expression is impossible
 * @returns {Replacer} hash replacer function
 */
const hashLength = (
	replacer,
	handler,
	assetInfo,
	hashName,
	sourceDigest,
	fullValue,
	recordDigest,
	digestHandler
) => {
	/** @type {Replacer} */
	const fn = (match, arg, input, digest) => {
		/** @type {string} */
		let result;
		const length = arg && Number.parseInt(arg, 10);

		if (digest && digestHandler) {
			result = digestHandler(digest, length || undefined);
		} else if (digest) {
			const hash = reEncodeDigest(
				fullValue !== undefined ? fullValue : replacer(match, arg, input),
				sourceDigest,
				digest
			);
			result = length ? hash.slice(0, length) : hash;
		} else if (length && handler) {
			result = handler(length);
		} else {
			const hash = replacer(match, arg, input);

			result = length ? hash.slice(0, length) : hash;
		}
		if (assetInfo) {
			assetInfo.immutable = true;
			if (digest && recordDigest) {
				// `base64safe` is encoded as `base64url`; record what the value is in.
				(assetInfo.contenthashDigest || (assetInfo.contenthashDigest = {}))[
					result
				] = digest === "base64safe" ? "base64url" : digest;
			}
			if (Array.isArray(assetInfo[hashName])) {
				assetInfo[hashName] = [...assetInfo[hashName], result];
			} else if (assetInfo[hashName]) {
				assetInfo[hashName] = [assetInfo[hashName], result];
			} else {
				assetInfo[hashName] = result;
			}
		}
		return result;
	};

	return fn;
};

/** @typedef {(match: string, arg: string | undefined, input: string, digest?: string) => string} Replacer */

/**
 * Returns replacer.
 * @param {string | number | null | undefined | (() => string | number | null | undefined)} value value
 * @param {boolean=} allowEmpty allow empty
 * @returns {Replacer} replacer
 */
const replacer = (value, allowEmpty) => {
	/** @type {Replacer} */
	const fn = (match, arg, input) => {
		if (typeof value === "function") {
			value = value();
		}
		if (value === null || value === undefined) {
			if (!allowEmpty) {
				throw new Error(
					`Path variable ${match} not implemented in this context: ${input}`
				);
			}

			return "";
		}

		return `${value}`;
	};

	return fn;
};

/** @type {Map<string, (...args: EXPECTED_ANY[]) => EXPECTED_ANY>} */
const deprecationCache = new Map();
const deprecatedFunction = (() => () => {})();
/**
 * Returns function with deprecation output.
 * @template {(...args: EXPECTED_ANY[]) => EXPECTED_ANY} T
 * @param {T} fn function
 * @param {string} message message
 * @param {string} code code
 * @returns {T} function with deprecation output
 */
const deprecated = (fn, message, code) => {
	let d = deprecationCache.get(message);
	if (d === undefined) {
		d = util.deprecate(deprecatedFunction, message, code);
		deprecationCache.set(message, d);
	}
	return /** @type {T} */ (
		(...args) => {
			d();
			return fn(...args);
		}
	);
};

/**
 * Callback used to compute a path from contextual data. The type parameter
 * narrows the `pathData` shape when the caller knows it operates in a chunk
 * (`PathDataChunk`) or module (`PathDataModule`) context — defaults to the
 * fully-optional `PathData` for backward compatibility.
 * @template {PathData} [T=PathData]
 * @typedef {(pathData: T, assetInfo?: AssetInfo) => string} TemplatePathFn
 */

/**
 * Either a raw template string (e.g. `"[name].[contenthash].js"`) or a
 * generic `TemplatePathFn`. Method signatures that need to thread a narrowed
 * `PathData` shape spell the function side out as `TemplatePathFn<T>`
 * directly — `TemplatePath` itself stays a plain alias so local JSDoc
 * re-imports keep a single shared identity.
 * @typedef {string | TemplatePathFn} TemplatePath
 */

/**
 * Returns the interpolated path.
 * @template {PathData} [T=PathData]
 * @param {string | TemplatePathFn<T>} path the raw path
 * @param {T} data context data
 * @param {AssetInfo=} assetInfo extra info about the asset (will be written to)
 * @returns {string} the interpolated path
 */
const interpolate = (path, data, assetInfo) => {
	if (typeof path === "function") {
		path = path(data, assetInfo);
	}

	// Literal paths carry no `[placeholder]`, so the whole replacement table
	// and regex pass are pure overhead — building replacers has no side effects
	// (those only fire when a replacer is invoked), so the output is identical.
	if (!path.includes("[")) {
		return path;
	}

	// Only build replacers for placeholders the template actually uses — most
	// templates reference a handful, so building the whole table per call is
	// wasted work. Replacer construction has no side effects (those fire only
	// when a replacer is invoked, which happens for present kinds), so this is
	// output-identical.
	const presentKinds = getPresentKinds(path);

	const chunkGraph = data.chunkGraph;
	// Digest the stored hashes are encoded in, so `[hash:<digest>]` can re-encode.
	const sourceDigest = data.hashDigest || "hex";

	/** @type {Map<string, Replacer>} */
	const replacements = new Map();

	// Filename context
	//
	// Placeholders
	//
	// for /some/path/file.js?query#fragment:
	// [file] - /some/path/file.js
	// [query] - ?query
	// [fragment] - #fragment
	// [base] - file.js
	// [path] - /some/path/
	// [name] - file
	// [ext] - .js
	if (
		typeof data.filename === "string" &&
		(presentKinds.has("file") ||
			presentKinds.has("query") ||
			presentKinds.has("fragment") ||
			presentKinds.has("path") ||
			presentKinds.has("base") ||
			presentKinds.has("name") ||
			presentKinds.has("ext") ||
			presentKinds.has("filebase"))
	) {
		// check that filename is data uri
		const match = data.filename.match(/^data:([^;,]+)/);
		if (match) {
			const ext = getMimeTypes().extension(match[1]);
			const emptyReplacer = replacer("", true);
			// "XXXX" used for `updateHash`, so we don't need it here
			const contentHash =
				data.contentHash && !/X+/.test(data.contentHash)
					? data.contentHash
					: false;
			const baseReplacer = contentHash ? replacer(contentHash) : emptyReplacer;

			if (presentKinds.has("file")) replacements.set("file", emptyReplacer);
			if (presentKinds.has("query")) replacements.set("query", emptyReplacer);
			if (presentKinds.has("fragment")) {
				replacements.set("fragment", emptyReplacer);
			}
			if (presentKinds.has("path")) replacements.set("path", emptyReplacer);
			if (presentKinds.has("base")) replacements.set("base", baseReplacer);
			if (presentKinds.has("name")) replacements.set("name", baseReplacer);
			if (presentKinds.has("ext")) {
				replacements.set("ext", replacer(ext ? `.${ext}` : "", true));
			}
			// Legacy
			if (presentKinds.has("filebase")) {
				replacements.set(
					"filebase",
					deprecated(
						baseReplacer,
						"[filebase] is now [base]",
						"DEP_WEBPACK_TEMPLATE_PATH_PLUGIN_REPLACE_PATH_VARIABLES_FILENAME"
					)
				);
			}
		} else {
			const { path: file, query, fragment } = parseResource(data.filename);

			const ext = extname(file);
			const base = basename(file);
			const name = base.slice(0, base.length - ext.length);
			const path = file.slice(0, file.length - base.length);

			if (presentKinds.has("file")) replacements.set("file", replacer(file));
			if (presentKinds.has("query")) {
				replacements.set("query", replacer(query, true));
			}
			if (presentKinds.has("fragment")) {
				replacements.set("fragment", replacer(fragment, true));
			}
			if (presentKinds.has("path")) {
				replacements.set("path", replacer(path, true));
			}
			if (presentKinds.has("base")) replacements.set("base", replacer(base));
			if (presentKinds.has("name")) replacements.set("name", replacer(name));
			if (presentKinds.has("ext")) replacements.set("ext", replacer(ext, true));
			// Legacy
			if (presentKinds.has("filebase")) {
				replacements.set(
					"filebase",
					deprecated(
						replacer(base),
						"[filebase] is now [base]",
						"DEP_WEBPACK_TEMPLATE_PATH_PLUGIN_REPLACE_PATH_VARIABLES_FILENAME"
					)
				);
			}
		}
	}

	// Compilation context
	//
	// Placeholders
	//
	// [fullhash] - data.hash (3a4b5c6e7f)
	//
	// Legacy Placeholders
	//
	// [hash] - data.hash (3a4b5c6e7f)
	if (data.hash && (presentKinds.has("fullhash") || presentKinds.has("hash"))) {
		const hashReplacer = hashLength(
			replacer(data.hash),
			data.hashWithLength,
			assetInfo,
			"fullhash",
			data.fullHashDigest || sourceDigest,
			data.fullHash,
			undefined,
			data.hashWithDigest
		);

		if (presentKinds.has("fullhash")) {
			replacements.set("fullhash", hashReplacer);
		}

		// Legacy — but a css-loader-style `[hash]` local ident is not deprecated
		if (presentKinds.has("hash")) {
			replacements.set(
				"hash",
				data.hashAsFullHash
					? hashReplacer
					: deprecated(
							hashReplacer,
							"[hash] is now [fullhash] (also consider using [chunkhash] or [contenthash], see documentation for details)",
							"DEP_WEBPACK_TEMPLATE_PATH_PLUGIN_REPLACE_PATH_VARIABLES_HASH"
						)
			);
		}
	}

	// Chunk Context
	//
	// Placeholders
	//
	// [id] - chunk.id (0.js)
	// [name] - chunk.name (app.js)
	// [chunkhash] - chunk.hash (7823t4t4.js)
	// [contenthash] - chunk.contentHash[type] (3256u3zg.js)
	if (data.chunk) {
		const chunk = data.chunk;

		const contentHashType = data.contentHashType;

		if (presentKinds.has("id")) replacements.set("id", replacer(chunk.id));
		if (presentKinds.has("name")) {
			replacements.set("name", replacer(chunk.name || chunk.id));
		}
		if (presentKinds.has("chunkhash")) {
			replacements.set(
				"chunkhash",
				hashLength(
					replacer(chunk instanceof Chunk ? chunk.renderedHash : chunk.hash),
					"hashWithLength" in chunk ? chunk.hashWithLength : undefined,
					assetInfo,
					"chunkhash",
					sourceDigest,
					chunk.hash,
					undefined,
					"hashWithDigest" in chunk ? chunk.hashWithDigest : undefined
				)
			);
		}
		if (presentKinds.has("contenthash")) {
			const ct = /** @type {string} */ (contentHashType);
			replacements.set(
				"contenthash",
				hashLength(
					replacer(
						data.contentHash ||
							(contentHashType &&
								chunk.contentHash &&
								chunk.contentHash[contentHashType])
					),
					data.contentHashWithLength ||
						("contentHashWithLength" in chunk && chunk.contentHashWithLength
							? chunk.contentHashWithLength[ct]
							: undefined),
					assetInfo,
					"contenthash",
					sourceDigest,
					// full content digest, so a static `[contenthash:<digest>]` re-encodes
					// from full entropy (the runtime path uses `contentHashWithDigest`)
					"contentHashFull" in chunk && chunk.contentHashFull
						? chunk.contentHashFull[ct]
						: undefined,
					data.realContentHash,
					"contentHashWithDigest" in chunk && chunk.contentHashWithDigest
						? chunk.contentHashWithDigest[ct]
						: undefined
				)
			);
		}
	}

	// Module Context
	//
	// Placeholders
	//
	// [id] - module.id (2.png)
	// [hash] - module.hash (6237543873.png)
	//
	// Legacy Placeholders
	//
	// [moduleid] - module.id (2.png)
	// [modulehash] - module.hash (6237543873.png)
	if (data.module) {
		const module = data.module;
		const needId = presentKinds.has("id");
		const needModuleId = presentKinds.has("moduleid");
		// `data.hashAsFullHash` keeps `[hash]` as the `[fullhash]` alias (CSS local
		// idents) instead of repurposing it to the module hash; `[modulehash]` stays.
		const needHash = presentKinds.has("hash") && !data.hashAsFullHash;

		if (needId || needModuleId) {
			const idReplacer = replacer(() =>
				(data.prepareId || prepareId)(
					module instanceof Module
						? /** @type {ModuleId} */
							(/** @type {ChunkGraph} */ (chunkGraph).getModuleId(module))
						: module.id
				)
			);
			if (needId) replacements.set("id", idReplacer);
			// Legacy
			if (needModuleId) {
				replacements.set(
					"moduleid",
					deprecated(
						idReplacer,
						"[moduleid] is now [id]",
						"DEP_WEBPACK_TEMPLATE_PATH_PLUGIN_REPLACE_PATH_VARIABLES_MODULE_ID"
					)
				);
			}
		}

		// `[hash]` aliases module content hash when present, else module hash.
		const wantModuleHash =
			presentKinds.has("modulehash") || (needHash && !data.contentHash);
		const wantContentHash =
			presentKinds.has("contenthash") || (needHash && data.contentHash);
		/** @type {Replacer | undefined} */
		let moduleHashReplacer;
		/** @type {Replacer | undefined} */
		let contentHashReplacer;
		if (wantModuleHash) {
			moduleHashReplacer = hashLength(
				replacer(() =>
					module instanceof Module
						? /** @type {ChunkGraph} */
							(chunkGraph).getRenderedModuleHash(module, data.runtime)
						: module.hash
				),
				"hashWithLength" in module ? module.hashWithLength : undefined,
				assetInfo,
				"modulehash",
				sourceDigest,
				// `getModuleHash` is the untruncated digest (`getRenderedModuleHash` is
				// the truncated one), so `[modulehash:<digest>]` re-encodes full entropy
				module instanceof Module
					? /** @type {ChunkGraph} */ (chunkGraph).getModuleHash(
							module,
							data.runtime
						)
					: module.hash
			);
			if (presentKinds.has("modulehash")) {
				replacements.set("modulehash", moduleHashReplacer);
			}
		}
		if (wantContentHash) {
			contentHashReplacer = hashLength(
				replacer(/** @type {string} */ (data.contentHash)),
				undefined,
				assetInfo,
				"contenthash",
				sourceDigest,
				// full content digest, so a static `[contenthash:<digest>]` re-encodes
				// from full entropy (asset modules supply it via `contentHashFull`)
				data.contentHashFull,
				data.realContentHash
			);
			if (presentKinds.has("contenthash")) {
				replacements.set("contenthash", contentHashReplacer);
			}
		}
		if (needHash) {
			replacements.set(
				"hash",
				/** @type {Replacer} */
				(data.contentHash ? contentHashReplacer : moduleHashReplacer)
			);
		}
	}

	// Other things
	//
	// Placeholders
	//
	// [url] - data.url
	// [uniqueName] - data.uniqueName (output.uniqueName)
	// [uniquename] - alias of [uniqueName]
	if (data.url && presentKinds.has("url")) {
		replacements.set("url", replacer(data.url));
	}
	if (
		data.uniqueName !== undefined &&
		(presentKinds.has("uniqueName") || presentKinds.has("uniquename"))
	) {
		const uniqueNameReplacer = replacer(data.uniqueName);
		if (presentKinds.has("uniqueName")) {
			replacements.set("uniqueName", uniqueNameReplacer);
		}
		if (presentKinds.has("uniquename")) {
			replacements.set("uniquename", uniqueNameReplacer);
		}
	}
	if (presentKinds.has("runtime")) {
		if (typeof data.runtime === "string") {
			replacements.set(
				"runtime",
				replacer(() =>
					(data.prepareId || prepareId)(/** @type {string} */ (data.runtime))
				)
			);
		} else {
			replacements.set("runtime", replacer("_"));
		}
	}

	path = path.replace(REGEXP, (match, content) => {
		if (content.length + 2 === match.length) {
			const contentMatch = /^(\w+)(?::(\w+))?(?::(\w+))?$/.exec(content);
			if (!contentMatch) return match;
			const [, kind, arg1, arg2] = contentMatch;
			const replacer = replacements.get(kind);
			if (replacer !== undefined) {
				// `[kind:length]`, `[kind:digest]` or `[kind:digest:length]`.
				/** @type {string | undefined} */
				let digest;
				/** @type {string | undefined} */
				let length = arg1;
				if (arg2 !== undefined) {
					digest = arg1;
					length = arg2;
				} else if (arg1 !== undefined && !/^\d+$/.test(arg1)) {
					digest = arg1;
					length = undefined;
				}
				return replacer(match, length, /** @type {string} */ (path), digest);
			}
		} else if (match.startsWith("[\\") && match.endsWith("\\]")) {
			return `[${match.slice(2, -2)}]`;
		}
		return match;
	});

	return path;
};

const plugin = "TemplatedPathPlugin";

class TemplatedPathPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(plugin, (compilation) => {
			compilation.hooks.assetPath.tap(plugin, (path, data, assetInfo) => {
				// Default from output options so `[uniqueName]` resolves in every template
				if (data.uniqueName === undefined) {
					data.uniqueName = compilation.outputOptions.uniqueName;
				}
				// Digest the stored hashes use, so `[hash:<digest>]` can re-encode them
				if (data.hashDigest === undefined) {
					data.hashDigest = compilation.outputOptions.hashDigest;
				}
				// Untruncated compilation hash, so `[fullhash:<digest>]` keeps full entropy
				if (data.fullHash === undefined && data.hash === compilation.hash) {
					data.fullHash = compilation.fullHash;
				}
				// `RealContentHashPlugin` rehashes content; flag it so an inline digest
				// on `[contenthash]` is recorded and the recomputed hash re-encodes in it.
				if (data.realContentHash === undefined) {
					data.realContentHash = Boolean(
						compilation.options.optimization.realContentHash
					);
				}
				return interpolate(path, data, assetInfo);
			});
		});
	}
}

module.exports = TemplatedPathPlugin;
module.exports.getPresentKinds = getPresentKinds;
module.exports.interpolate = interpolate;
module.exports.reEncodeDigest = reEncodeDigest;
