/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const path = require("path");
const asyncLib = require("neo-async");
const { RawSource } = require("webpack-sources");
const Compilation = require("./Compilation");
const EmptyCopyPatternWarning = require("./errors/EmptyCopyPatternWarning");
const WebpackError = require("./errors/WebpackError");
const createHash = require("./util/createHash");
const { join } = require("./util/fs");
const {
	escapeGlobPattern,
	extractGlobBaseDir,
	globMatchWithOptions,
	normalizePathSeparators,
	normalizePathSeparatorsForPath,
	unescapeGlobPath
} = require("./util/globUtils");
const { ABSOLUTE_PATH_REGEXP } = require("./util/identifier");

/** @import { CopyObjectPattern, CopyPattern, CopyPatterns } from "../declarations/WebpackOptions" */
/** @import Compiler from "./Compiler" */
/** @import { AssetInfo, PathData } from "./Compilation" */
/** @import CacheFacade from "./CacheFacade" */
/** @import { Snapshot } from "./FileSystemInfo" */
/** @import { Logger } from "./logging/Logger" */
/** @import { Dirent, InputFileSystem, IStats } from "./util/fs" */
/** @import { Source } from "webpack-sources" */

/**
 * @callback CopyFilenameFunction
 * @param {PathData} pathData path data of the copied file
 * @param {AssetInfo=} assetInfo asset info
 * @returns {string} filename of the copied file, relative to `to`
 */

/**
 * @callback CopyTransform
 * @param {Buffer} content content of the file
 * @param {string} absoluteFilename absolute path of the file
 * @returns {string | Buffer | Promise<string | Buffer>} content of the asset
 */

/** @typedef {"dir" | "file" | "glob"} TypeOfFrom */
/** @typedef {{ source: Source, snapshot: InstanceType<Snapshot> }} CacheEntry */

/**
 * @typedef {object} CopiedFile
 * @property {string} absoluteFilename absolute path of the source file
 * @property {string} sourceFilename path of the source file, relative to the compiler context
 * @property {string} filename path of the asset, relative to `output.path`
 * @property {Source} source content of the asset
 * @property {AssetInfo} info asset info
 */

/** @typedef {{ files: CopiedFile[], errors: WebpackError[], warnings: WebpackError[] }} CopiedPattern */

/**
 * @typedef {object} NormalizedPattern
 * @property {CopyObjectPattern} pattern the pattern as the user wrote it
 * @property {string} base directory the copied paths are relative to
 * @property {number} index index of the pattern
 */

const PLUGIN_NAME = "CopyPlugin";

// keeps the directory structure below `from`, as `publicDir` copies do
const DEFAULT_FILENAME = "[path][base]";
const FILE_CONCURRENCY = 100;
const PATTERN_CONCURRENCY = 2;
const DIRECTORY_CONCURRENCY = 20;

/**
 * @template T
 * @template R
 * @param {T[]} items items
 * @param {number} limit maximum number of items processed at the same time
 * @param {(item: T) => Promise<R>} fn processor
 * @returns {Promise<R[]>} results, in the order of the items
 */
const mapLimit = (items, limit, fn) =>
	new Promise((resolve, reject) => {
		asyncLib.mapLimit(
			items,
			limit,
			(item, callback) => {
				fn(item).then((result) => callback(null, result), callback);
			},
			(err, results) => {
				if (err) return reject(err);
				resolve(/** @type {R[]} */ (results));
			}
		);
	});

/**
 * @param {InputFileSystem} fs input file system
 * @param {string} filePath path
 * @returns {Promise<IStats | undefined>} stats, undefined when the path does not exist
 */
const stat = (fs, filePath) =>
	new Promise((resolve, reject) => {
		/** @type {NonNullable<InputFileSystem["stat"]>} */
		(fs.stat)(filePath, (err, stats) => {
			if (err) {
				if (err.code === "ENOENT" || err.code === "ENOTDIR") {
					return resolve(undefined);
				}
				return reject(err);
			}
			resolve(/** @type {IStats} */ (stats));
		});
	});

/**
 * @param {InputFileSystem} fs input file system
 * @param {string} filePath path
 * @returns {Promise<Buffer>} content of the file
 */
const readFile = (fs, filePath) =>
	new Promise((resolve, reject) => {
		fs.readFile(filePath, (err, content) => {
			if (err) return reject(err);
			resolve(/** @type {Buffer} */ (content));
		});
	});

/**
 * Reads the directory with the type of each entry, which is what lets the walk
 * classify an entry without a stat of its own.
 * @param {InputFileSystem} fs input file system
 * @param {string} directory path
 * @returns {Promise<Dirent[]>} entries of the directory, empty when it does not exist
 */
const readDirectory = (fs, directory) =>
	new Promise((resolve, reject) => {
		fs.readdir(directory, { withFileTypes: true }, (err, entries) => {
			if (err) {
				if (err.code === "ENOENT" || err.code === "ENOTDIR") return resolve([]);
				return reject(err);
			}
			resolve(/** @type {Dirent[]} */ (entries));
		});
	});

/**
 * @param {InputFileSystem} fs input file system
 * @param {string} directory path
 * @returns {Promise<string>} real path of the directory, the path itself when it can't be resolved
 */
const realpath = (fs, directory) =>
	new Promise((resolve) => {
		if (!fs.realpath) {
			resolve(directory);
			return;
		}
		fs.realpath(directory, (err, realPath) => {
			resolve(err ? directory : /** @type {string} */ (realPath));
		});
	});

/**
 * @param {InputFileSystem} fs input file system
 * @param {string} directory absolute path of the directory
 * @param {Set<string>} visited real paths of the symlinked directories already walked, guarding against cycles
 * @param {number} maxDepth how many directories below this one can still hold a match
 * @returns {Promise<string[]>} absolute paths of the files below it, in a stable order
 */
const walkDirectory = async (fs, directory, visited, maxDepth) => {
	// sorted so that the copied assets keep a stable order
	const entries = (await readDirectory(fs, directory)).sort((a, b) =>
		a.name < b.name ? -1 : a.name > b.name ? 1 : 0
	);
	const results = await mapLimit(
		entries,
		DIRECTORY_CONCURRENCY,
		async (entry) => {
			const filePath = join(fs, directory, entry.name);
			// a symlink reports neither file nor directory, so it alone pays for a
			// stat, and it alone can lead back to a directory the walk entered
			const stats = entry.isSymbolicLink() ? await stat(fs, filePath) : entry;
			// the target is gone, or is neither a file nor a directory
			if (stats === undefined) return [];
			if (stats.isFile()) return [filePath];
			if (!stats.isDirectory() || maxDepth === 0) return [];
			if (entry.isSymbolicLink()) {
				const realPath = await realpath(fs, filePath);
				if (visited.has(realPath)) return [];
				visited.add(realPath);
			}
			return walkDirectory(fs, filePath, visited, maxDepth - 1);
		}
	);
	/** @type {string[]} */
	const files = [];
	for (const result of results) {
		for (const file of result) files.push(file);
	}
	return files;
};

/**
 * @param {InputFileSystem} fs input file system
 * @param {string} base absolute path of the directory the glob is anchored on
 * @param {number} maxDepth how many directories below it can still hold a match
 * @returns {Promise<string[]>} absolute paths of the files below it, in a stable order
 */
const walkBase = async (fs, base, maxDepth) =>
	// the base counts as walked, so a symlink pointing back at it ends there
	walkDirectory(fs, base, new Set([await realpath(fs, base)]), maxDepth);

/**
 * @param {Error} error error thrown while copying
 * @returns {WebpackError} the error as a webpack error
 */
const toWebpackError = (error) => {
	if (error instanceof WebpackError) return error;
	const webpackError = new WebpackError(error.message);
	webpackError.details = error.stack;
	return webpackError;
};

class CopyPlugin {
	/**
	 * @param {CopyPatterns} patterns patterns of the files which are copied
	 */
	constructor(patterns) {
		this.patterns = patterns;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		// TODO a changed copied file rebuilds and re-emits, but the compilation hash
		// it is emitted after does not move, so a dev server has nothing to reload on
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			const logger = compilation.getLogger("webpack.CopyPlugin");
			const cache = compilation.getCache(PLUGIN_NAME);
			compilation.hooks.processAssets.tapPromise(
				{
					name: PLUGIN_NAME,
					stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
				},
				() => this._copy(compiler, compilation, logger, cache)
			);
		});
	}

	/**
	 * @private
	 * @param {Compiler} compiler the compiler
	 * @param {Compilation} compilation the compilation
	 * @param {Logger} logger the logger
	 * @param {CacheFacade} cache the cache
	 * @returns {Promise<void>}
	 */
	async _copy(compiler, compilation, logger, cache) {
		const results = await mapLimit(
			this.patterns.map((pattern, index) => ({ pattern, index })),
			PATTERN_CONCURRENCY,
			async ({ pattern, index }) => {
				try {
					return await this._copyPattern(
						compiler,
						compilation,
						logger,
						cache,
						pattern,
						index
					);
				} catch (err) {
					return {
						files: [],
						errors: [toWebpackError(/** @type {Error} */ (err))],
						warnings: []
					};
				}
			}
		);
		// patterns are processed concurrently, so both diagnostics and assets are
		// ordered by the pattern rather than by which pattern finished first
		for (const result of results) {
			for (const error of result.errors) compilation.errors.push(error);
			for (const warning of result.warnings) {
				compilation.warnings.push(warning);
			}
		}
		for (const result of results) {
			for (const file of result.files) {
				const { absoluteFilename, sourceFilename, filename, source } = file;
				/** @type {AssetInfo} */
				const info = { copied: true, sourceFilename, ...file.info };
				// patterns are copied in order, so a later one replaces what an
				// earlier one (or another plugin) put at the same filename
				if (compilation.getAsset(filename)) {
					compilation.updateAsset(filename, source, info);
					logger.log(
						`copied '${absoluteFilename}' over the existing '${filename}'`
					);
					continue;
				}
				compilation.emitAsset(filename, source, info);
				logger.log(`copied '${absoluteFilename}' to '${filename}'`);
			}
		}
	}

	/**
	 * @private
	 * @param {Compiler} compiler the compiler
	 * @param {Compilation} compilation the compilation
	 * @param {Logger} logger the logger
	 * @param {CacheFacade} cache the cache
	 * @param {CopyPattern} item the pattern
	 * @param {number} index index of the pattern
	 * @returns {Promise<CopiedPattern>} the copied files and the diagnostics
	 */
	async _copyPattern(compiler, compilation, logger, cache, item, index) {
		const fs = /** @type {InputFileSystem} */ (compiler.inputFileSystem);
		/** @type {CopyObjectPattern} */
		const pattern = typeof item === "string" ? { from: item } : item;
		const { from } = pattern;
		const absoluteFrom = path.isAbsolute(from)
			? path.normalize(from)
			: path.resolve(compiler.context, from);
		const stats = await stat(fs, absoluteFrom);
		/** @type {TypeOfFrom} */
		const typeOfFrom = !stats
			? "glob"
			: stats.isDirectory()
				? "dir"
				: stats.isFile()
					? "file"
					: "glob";

		/** @type {string} */
		let glob;
		switch (typeOfFrom) {
			case "dir":
				glob = `${escapeGlobPattern(normalizePathSeparatorsForPath(absoluteFrom))}/**/*`;
				break;
			case "file":
				glob = escapeGlobPattern(normalizePathSeparatorsForPath(absoluteFrom));
				break;
			default:
				glob = this._resolveGlob(compiler.context, from);
		}
		// everything is copied relative to what `from` names literally, so a
		// directory, a file and a glob all keep the structure below it
		const escapedBase = extractGlobBaseDir(glob);
		// only `**` matches across depths, so any other glob names how deep a
		// match can sit and the walk never descends past it
		const segments = glob.slice(escapedBase.length).split("/");
		const maxDepth = segments.includes("**")
			? Number.POSITIVE_INFINITY
			: segments.length - 1;
		// the walk reads the base through the cache the watcher purges under the
		// watched directory's own name, so both have to be that one native path
		const base = path.resolve(compiler.context, unescapeGlobPath(escapedBase));
		// an absolute pattern keeps the `..` segments the walk resolves away, so
		// the glob is re-anchored on the base the walk reads
		glob = path.posix.join(
			escapeGlobPattern(normalizePathSeparatorsForPath(base)),
			...segments
		);
		logger.debug(`'${from}' is a ${typeOfFrom}, globbing '${glob}'`);

		const entries =
			typeOfFrom === "file"
				? [absoluteFrom]
				: (await walkBase(fs, base, maxDepth)).filter((filePath) =>
						globMatchWithOptions(glob, normalizePathSeparatorsForPath(filePath))
					);

		if (entries.length === 0) {
			// only a glob can name a base which is not there — a directory `from`
			// was stat'd above, and a file one watches itself
			await this._addPatternDependency(
				fs,
				compilation,
				typeOfFrom,
				absoluteFrom,
				base,
				typeOfFrom === "glob"
			);
			return {
				files: [],
				errors: [],
				warnings: [new EmptyCopyPatternWarning(from, glob)]
			};
		}

		await this._addPatternDependency(
			fs,
			compilation,
			typeOfFrom,
			absoluteFrom,
			base,
			false
		);

		const results = await mapLimit(entries, FILE_CONCURRENCY, async (entry) => {
			try {
				return await this._copyFile(
					compiler,
					compilation,
					logger,
					cache,
					{ pattern, base, index },
					path.normalize(entry)
				);
			} catch (err) {
				return toWebpackError(/** @type {Error} */ (err));
			}
		});
		/** @type {CopiedFile[]} */
		const files = [];
		/** @type {WebpackError[]} */
		const errors = [];
		/** @type {Set<string>} */
		const filenames = new Set();
		for (const result of results) {
			if (result instanceof WebpackError) {
				errors.push(result);
				continue;
			}
			// a `to` naming no placeholder collapses every file onto one asset,
			// which silently drops all but the first one
			if (filenames.has(result.filename)) {
				errors.push(
					new WebpackError(
						`Multiple files of the '${from}' pattern of 'output.copy' are copied to '${result.filename}', keep a '[path]' or '[name]' placeholder in the 'filename' option to tell them apart`
					)
				);
				continue;
			}
			filenames.add(result.filename);
			files.push(result);
		}

		return { files, errors, warnings: [] };
	}

	/**
	 * @private
	 * @param {string} context context the pattern is resolved from
	 * @param {string} pattern glob or path
	 * @returns {string} absolute glob with `/` separators
	 */
	_resolveGlob(context, pattern) {
		const normalizedPattern = normalizePathSeparators(pattern);
		// an absolute pattern is a path, so every `\` in it separates rather than
		// escapes — a relative one keeps them, as a name may hold them on posix
		return ABSOLUTE_PATH_REGEXP.test(normalizedPattern)
			? normalizePathSeparatorsForPath(normalizedPattern)
			: path.posix.join(
					escapeGlobPattern(normalizePathSeparatorsForPath(context)),
					normalizedPattern
				);
	}

	/**
	 * @private
	 * @param {InputFileSystem} fs input file system
	 * @param {Compilation} compilation the compilation
	 * @param {TypeOfFrom} typeOfFrom what `from` names
	 * @param {string} absoluteFrom absolute path of `from`
	 * @param {string} base native base directory of the glob
	 * @param {boolean} checkExistence whether a missing directory is watched for its creation
	 * @returns {Promise<void>}
	 */
	async _addPatternDependency(
		fs,
		compilation,
		typeOfFrom,
		absoluteFrom,
		base,
		checkExistence
	) {
		// a single file needs no directory watched, only itself
		if (typeOfFrom === "file") {
			compilation.fileDependencies.add(absoluteFrom);
			return;
		}
		// watching a directory which does not exist yet reports it as removed on
		// the initial aggregation, so it is watched as missing until it is created
		if (checkExistence && !(await stat(fs, base))) {
			compilation.missingDependencies.add(base);
			return;
		}
		compilation.contextDependencies.add(base);
	}

	/**
	 * @private
	 * @param {Compiler} compiler the compiler
	 * @param {Compilation} compilation the compilation
	 * @param {Logger} logger the logger
	 * @param {CacheFacade} cache the cache
	 * @param {NormalizedPattern} normalizedPattern the pattern the file belongs to
	 * @param {string} absoluteFilename absolute path of the file
	 * @returns {Promise<CopiedFile>} the copied file
	 */
	async _copyFile(
		compiler,
		compilation,
		logger,
		cache,
		normalizedPattern,
		absoluteFilename
	) {
		const { pattern, base, index } = normalizedPattern;
		const fs = /** @type {InputFileSystem} */ (compiler.inputFileSystem);
		const sourceFilename = normalizePathSeparatorsForPath(
			path.relative(compiler.context, absoluteFilename)
		);

		compilation.fileDependencies.add(absoluteFilename);

		const cacheIdentifier = `${sourceFilename}|${index}`;
		const cacheEntry = /** @type {CacheEntry | undefined} */ (
			await cache.getPromise(cacheIdentifier, null)
		);
		/** @type {Source | undefined} */
		let source;
		if (
			cacheEntry &&
			(await this._checkSnapshotValid(compilation, cacheEntry.snapshot))
		) {
			({ source } = cacheEntry);
			logger.debug(`restored '${absoluteFilename}' from cache`);
		}
		if (!source) {
			const startTime = Date.now();
			source = new RawSource(await readFile(fs, absoluteFilename));
			const snapshot = await this._createSnapshot(
				compilation,
				startTime,
				absoluteFilename
			);
			if (snapshot) {
				await cache.storePromise(cacheIdentifier, null, { source, snapshot });
			}
		}

		if (pattern.transform) {
			source = await this._transform(
				cache,
				pattern.transform,
				source,
				sourceFilename,
				absoluteFilename,
				index
			);
		}

		const template =
			pattern.filename === undefined ? DEFAULT_FILENAME : pattern.filename;
		// only a template asking for a hash pays for one
		const contentHash =
			typeof template === "string" && !template.includes("hash")
				? undefined
				: this._getContentHash(compilation, source.buffer());
		// `[path]`, `[name]`, `[base]` and `[ext]` are read off this one
		const filename = normalizePathSeparatorsForPath(
			path.relative(base, absoluteFilename)
		);
		const basename = path.basename(filename);
		const { path: interpolatedFilename, info } = compilation.getPathWithInfo(
			template,
			{
				filename,
				contentHash,
				// `[contenthash]` is only read in a chunk context, so the copied file
				// stands in as one — its `name` keeps `[name]` at the file's own name
				chunk:
					contentHash === undefined
						? undefined
						: {
								name: basename.slice(
									0,
									basename.length - path.extname(filename).length
								),
								id: sourceFilename,
								hash: contentHash
							}
			}
		);

		return {
			absoluteFilename,
			sourceFilename,
			filename: pattern.to
				? path.posix.join(
						normalizePathSeparatorsForPath(pattern.to),
						interpolatedFilename
					)
				: interpolatedFilename,
			source,
			info
		};
	}

	/**
	 * @private
	 * @param {CacheFacade} cache the cache
	 * @param {CopyTransform} transform the transform
	 * @param {Source} source content of the file
	 * @param {string} sourceFilename path of the file, relative to the compiler context
	 * @param {string} absoluteFilename absolute path of the file
	 * @param {number} index index of the pattern
	 * @returns {Promise<Source>} transformed content
	 */
	async _transform(
		cache,
		transform,
		source,
		sourceFilename,
		absoluteFilename,
		index
	) {
		// the transform is part of the configuration, so its source decides
		// together with the content whether a cached result still belongs to it
		const itemCache = cache.getItemCache(
			`transform|${index}|${sourceFilename}|${String(transform)}`,
			cache.getLazyHashedEtag(source)
		);
		const cached = /** @type {Source | undefined} */ (
			await itemCache.getPromise()
		);
		if (cached) return cached;
		const transformed = new RawSource(
			await transform(source.buffer(), absoluteFilename)
		);
		await itemCache.storePromise(transformed);
		return transformed;
	}

	/**
	 * @private
	 * @param {Compilation} compilation the compilation
	 * @param {Buffer} content content of the asset
	 * @returns {string} content hash of the asset
	 */
	_getContentHash(compilation, content) {
		const { hashDigest, hashDigestLength, hashFunction, hashSalt } =
			compilation.outputOptions;
		const hash = createHash(/** @type {string} */ (hashFunction));
		if (hashSalt) hash.update(hashSalt);
		hash.update(content);
		return /** @type {string} */ (hash.digest(hashDigest)).slice(
			0,
			hashDigestLength
		);
	}

	/**
	 * @private
	 * @param {Compilation} compilation the compilation
	 * @param {number} startTime time the file was read at
	 * @param {string} absoluteFilename absolute path of the file
	 * @returns {Promise<InstanceType<Snapshot> | undefined>} snapshot of the file
	 */
	_createSnapshot(compilation, startTime, absoluteFilename) {
		return new Promise((resolve, reject) => {
			compilation.fileSystemInfo.createSnapshot(
				startTime,
				[absoluteFilename],
				null,
				null,
				compilation.options.snapshot.module,
				(err, snapshot) => {
					if (err) return reject(err);
					resolve(/** @type {InstanceType<Snapshot> | undefined} */ (snapshot));
				}
			);
		});
	}

	/**
	 * @private
	 * @param {Compilation} compilation the compilation
	 * @param {InstanceType<Snapshot>} snapshot the snapshot
	 * @returns {Promise<boolean>} true, when the snapshot is still valid
	 */
	_checkSnapshotValid(compilation, snapshot) {
		return new Promise((resolve, reject) => {
			compilation.fileSystemInfo.checkSnapshotValid(
				snapshot,
				(err, isValid) => {
					if (err) return reject(err);
					resolve(isValid === true);
				}
			);
		});
	}
}

module.exports = CopyPlugin;
