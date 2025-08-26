/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const path = require("path");
const urlUtils = require("url");
const { decodeDataURI } = require("./dataURL");
const { isAbsolute, join } = require("./fs");

/**
 * @template T
 * @typedef {import("../../declarations/LoaderContext").LoaderContext<T>} LoaderContext
 */
/** @typedef {import("../../declarations/WebpackOptions").RuleSetRule["extractSourceMap"]} ExtractSourceMapOptions */
/** @typedef {import("./fs").InputFileSystem} InputFileSystem */

/**
 * @typedef {(input: string | Buffer<ArrayBufferLike>, resourcePath: string, fs: InputFileSystem) => Promise<{source: string | Buffer<ArrayBufferLike>, sourceMap: string | RawSourceMap | undefined, fileDependencies: string[]}>} SourceMapExtractorFunction
 */

/** @typedef {import("webpack-sources").RawSourceMap} RawSourceMap */

/**
 * @typedef {object} SourceMappingURL
 * @property {string} sourceMappingURL
 * @property {string} replacementString
 */

// Matches only the last occurrence of sourceMappingURL
const innerRegex = /\s*[#@]\s*sourceMappingURL\s*=\s*([^\s'"]*)\s*/;

const validProtocolPattern = /^[a-z][a-z0-9+.-]*:/i;

const sourceMappingURLRegex = new RegExp(
	"(?:" +
		"/\\*" +
		"(?:\\s*\r?\n(?://)?)?" +
		`(?:${innerRegex.source})` +
		"\\s*" +
		"\\*/" +
		"|" +
		`//(?:${innerRegex.source})` +
		")" +
		"\\s*"
);

/**
 * Extract source mapping URL from code comments
 * @param {string} code source code content
 * @returns {SourceMappingURL} source mapping information or null
 */
function getSourceMappingURL(code) {
	const lines = code.split(/^/m);
	let match;

	for (let i = lines.length - 1; i >= 0; i--) {
		match = lines[i].match(sourceMappingURLRegex);
		if (match) {
			break;
		}
	}

	const sourceMappingURL = match ? match[1] || match[2] || "" : "";

	return {
		sourceMappingURL: sourceMappingURL
			? decodeURI(sourceMappingURL)
			: sourceMappingURL,
		replacementString: match ? match[0] : ""
	};
}

/**
 * Get absolute path for source file
 * @param {InputFileSystem} fs file system
 * @param {string} context context directory
 * @param {string} request file request
 * @param {string} sourceRoot source root directory
 * @returns {string} absolute path
 */
function getAbsolutePath(fs, context, request, sourceRoot) {
	if (sourceRoot) {
		if (isAbsolute(sourceRoot)) {
			return join(fs, sourceRoot, request);
		}

		return join(fs, join(fs, context, sourceRoot), request);
	}

	return join(fs, context, request);
}

/**
 * Check if value is a URL
 * @param {string} value string to check
 * @returns {boolean} true if value is a URL
 */
function isURL(value) {
	return validProtocolPattern.test(value) && !path.win32.isAbsolute(value);
}

/**
 * Fetch source content from data URL
 * @param {InputFileSystem} fs file system
 * @param {string} sourceURL data URL
 * @returns {string} source content promise
 */
function fetchFromDataURL(fs, sourceURL) {
	const content = decodeDataURI(sourceURL);

	if (content) {
		return content.toString("utf8");
	}

	throw new Error(`Failed to parse source map from "data" URL: ${sourceURL}`);
}

/**
 * Fetch source content from file system
 * @param {InputFileSystem} fs file system
 * @param {string} sourceURL file URL
 * @returns {Promise<{path: string, data?: string}>} source content promise
 */
async function fetchFromFilesystem(fs, sourceURL) {
	let buffer;

	if (isURL(sourceURL)) {
		return { path: sourceURL };
	}

	try {
		buffer = await new Promise((resolve, reject) => {
			fs.readFile(
				sourceURL,
				(
					/** @type {Error | null} */ error,
					/** @type {Buffer<ArrayBufferLike> | undefined} */ data
				) => {
					if (error) {
						return reject(error);
					}

					return resolve(data);
				}
			);
		});
	} catch (error) {
		throw new Error(
			`Failed to parse source map from '${sourceURL}' file: ${error}`
		);
	}

	return { path: sourceURL, data: buffer.toString() };
}

/**
 * Fetch from multiple possible file paths
 * @param {InputFileSystem} fs file system
 * @param {string[]} possibleRequests array of possible file paths
 * @param {string} errorsAccumulator accumulated error messages
 * @returns {Promise<{path: string, data?: string}>} source content promise
 */
async function fetchPathsFromFilesystem(
	fs,
	possibleRequests,
	errorsAccumulator = ""
) {
	let result;

	try {
		result = await fetchFromFilesystem(fs, possibleRequests[0]);
	} catch (error) {
		errorsAccumulator += `${/** @type {Error} */ (error).message}\n\n`;

		const [, ...tailPossibleRequests] = possibleRequests;

		if (tailPossibleRequests.length === 0) {
			/** @type {Error} */ (error).message = errorsAccumulator;

			throw error;
		}

		return fetchPathsFromFilesystem(
			fs,
			tailPossibleRequests,
			errorsAccumulator
		);
	}

	return result;
}

/**
 * Fetch source content from URL
 * @param {InputFileSystem} fs file system
 * @param {string} context context directory
 * @param {string} url source URL
 * @param {string=} sourceRoot source root directory
 * @param {boolean=} skipReading whether to skip reading file content
 * @returns {Promise<{sourceURL: string, sourceContent?: string}>} source content promise
 */
async function fetchFromURL(fs, context, url, sourceRoot, skipReading = false) {
	// 1. It's an absolute url and it is not `windows` path like `C:\dir\file`
	if (isURL(url)) {
		// eslint-disable-next-line n/no-deprecated-api
		const { protocol } = urlUtils.parse(url);

		if (protocol === "data:") {
			if (skipReading) {
				return { sourceURL: "" };
			}

			const sourceContent = fetchFromDataURL(fs, url);

			return { sourceURL: "", sourceContent };
		}

		if (skipReading) {
			return { sourceURL: url };
		}

		if (protocol === "file:") {
			const pathFromURL = urlUtils.fileURLToPath(url);
			const sourceURL = path.normalize(pathFromURL);
			const { data: sourceContent } = await fetchFromFilesystem(fs, sourceURL);

			return { sourceURL, sourceContent };
		}

		throw new Error(
			`Failed to parse source map: '${url}' URL is not supported`
		);
	}

	// 2. It's a scheme-relative
	if (/^\/\//.test(url)) {
		throw new Error(
			`Failed to parse source map: '${url}' URL is not supported`
		);
	}

	// 3. Absolute path
	if (isAbsolute(url)) {
		let sourceURL = path.normalize(url);

		let sourceContent;

		if (!skipReading) {
			const possibleRequests = [sourceURL];

			if (url.startsWith("/")) {
				possibleRequests.push(
					getAbsolutePath(fs, context, sourceURL.slice(1), sourceRoot || "")
				);
			}

			const result = await fetchPathsFromFilesystem(fs, possibleRequests);

			sourceURL = result.path;
			sourceContent = result.data;
		}

		return { sourceURL, sourceContent };
	}

	// 4. Relative path
	const sourceURL = getAbsolutePath(fs, context, url, sourceRoot || "");

	let sourceContent;

	if (!skipReading) {
		const { data } = await fetchFromFilesystem(fs, sourceURL);

		sourceContent = data;
	}

	return { sourceURL, sourceContent };
}

/**
 * Extract source map from code content
 * @param {string | Buffer<ArrayBufferLike>} stringOrBuffer The input code content as string or buffer
 * @param {string} resourcePath The path to the resource file
 * @param {InputFileSystem} fs The file system interface for reading files
 * @param {((sourceMappingURL: string, resourcePath: string) => string)=} filterSourceMappingUrl Optional filter function for source mapping URLs
 * @returns {Promise<{source: string | Buffer<ArrayBufferLike>, sourceMap: string | RawSourceMap | undefined, fileDependencies: string[]}>} Promise resolving to extracted source map information
 */
async function extractSourceMap(
	stringOrBuffer,
	resourcePath,
	fs,
	filterSourceMappingUrl
) {
	const input =
		typeof stringOrBuffer === "string"
			? stringOrBuffer
			: stringOrBuffer.toString("utf8");
	const inputSourceMap = undefined;
	const output = {
		source: stringOrBuffer,
		sourceMap: inputSourceMap,
		fileDependencies: /** @type {string[]} */ ([])
	};
	const { sourceMappingURL, replacementString } = getSourceMappingURL(input);

	if (!sourceMappingURL) {
		return output;
	}

	const behaviourSourceMappingUrl =
		typeof filterSourceMappingUrl === "function"
			? filterSourceMappingUrl(sourceMappingURL, resourcePath)
			: "consume";

	switch (behaviourSourceMappingUrl) {
		case "skip":
			return output;
		case "false":
		case "remove":
			return {
				source: input.replace(replacementString, ""),
				sourceMap: inputSourceMap,
				fileDependencies: []
			};
	}

	const baseContext = path.dirname(resourcePath);

	const { sourceURL, sourceContent } = await fetchFromURL(
		fs,
		baseContext,
		sourceMappingURL
	);

	if (sourceURL) {
		output.fileDependencies.push(/** @type {string} */ (sourceURL));
	}

	if (!sourceContent) {
		return output;
	}

	/** @type {RawSourceMap} */
	const map = JSON.parse(sourceContent.replace(/^\)\]\}'/, ""));

	const context = sourceURL ? path.dirname(sourceURL) : baseContext;

	const resolvedSources = await Promise.all(
		map.sources.map(
			async (/** @type {string} */ source, /** @type {number} */ i) => {
				const originalSourceContent =
					map.sourcesContent &&
					typeof map.sourcesContent[i] !== "undefined" &&
					map.sourcesContent[i] !== null
						? map.sourcesContent[i]
						: undefined;
				const skipReading = typeof originalSourceContent !== "undefined";
				// We do not skipReading here, because we need absolute paths in sources.
				// This is necessary so that for sourceMaps with the same file structure in sources, name collisions do not occur.
				// https://github.com/webpack-contrib/source-map-loader/issues/51
				let { sourceURL, sourceContent } = await fetchFromURL(
					fs,
					context,
					source,
					map.sourceRoot,
					skipReading
				);

				if (skipReading) {
					sourceContent = originalSourceContent;
				} else if (sourceURL && !isURL(sourceURL)) {
					output.fileDependencies.push(/** @type {string} */ (sourceURL));
				}

				// Return original value of `source` when error happens
				return { sourceURL, sourceContent };
			}
		)
	);

	/** @type {RawSourceMap} */
	const newMap = { ...map };

	newMap.sources = [];
	newMap.sourcesContent = [];

	delete newMap.sourceRoot;

	for (const source of resolvedSources) {
		const { sourceURL, sourceContent } = source;

		newMap.sources.push(sourceURL || "");
		newMap.sourcesContent.push(sourceContent || "");
	}

	const sourcesContentIsEmpty =
		newMap.sourcesContent.filter(Boolean).length === 0;

	if (sourcesContentIsEmpty) {
		delete newMap.sourcesContent;
	}

	return {
		source: input.replace(replacementString, ""),
		sourceMap: /** @type {RawSourceMap} */ (newMap),
		fileDependencies: output.fileDependencies
	};
}

module.exports = extractSourceMap;
module.exports.getSourceMappingURL = getSourceMappingURL;
