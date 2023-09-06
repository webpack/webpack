/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const path = require("path");
const urlUtils = require("url");
const WebpackError = require("../WebpackError");
const { isAbsolute, join } = require("./fs");

/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("./fs").InputFileSystem} InputFileSystem */

// Matches only the last occurrence of sourceMappingURL
const innerRegex = /\s*[#@]\s*sourceMappingURL\s*=\s*([^\s'"]*)\s*/;

/* eslint-disable prefer-template */
const sourceMappingURLRegex = RegExp(
	"(?:" +
		"/\\*" +
		"(?:\\s*\r?\n(?://)?)?" +
		"(?:" +
		innerRegex.source +
		")" +
		"\\s*" +
		"\\*/" +
		"|" +
		"//(?:" +
		innerRegex.source +
		")" +
		")" +
		"\\s*"
);
/* eslint-enable prefer-template */

/**
 * @param {string} code code
 * @returns {{replacementString: null|string, sourceMappingURL: null|string}} source mapping url
 */
function getSourceMappingURL(code) {
	const lastLineIndex = code.indexOf("\n");
	const lastLine = code.substring(lastLineIndex + 1);
	const match = lastLine.match(sourceMappingURLRegex);

	const sourceMappingURL = match ? match[1] || match[2] || "" : null;

	return {
		sourceMappingURL: sourceMappingURL
			? decodeURI(sourceMappingURL)
			: sourceMappingURL,
		replacementString: match ? match[0] : null
	};
}

function getAbsolutePath(fs, context, request, sourceRoot) {
	if (sourceRoot) {
		if (isAbsolute(sourceRoot)) {
			return join(fs, sourceRoot, request);
		}

		return join(fs, join(fs, context, sourceRoot), request);
	}

	return join(fs, context, request);
}

function fetchFromDataURL(sourceURL, callback) {
	const dataURL = /^data:(?:[^;,]+)?(?:;[^;,]+)*?(?:;(base64))?,(.*)$/i.exec(
		sourceURL
	);

	if (dataURL) {
		const encodingName = dataURL[1] ? "base64" : "ascii";
		return callback(
			null,
			Buffer.from(dataURL[2], encodingName).toString("utf-8")
		);
	}

	callback(
		new Error(`Failed to parse source map from "data" URL: ${sourceURL}`)
	);
}

function fetchFromFilesystem(fs, sourceURL, callback) {
	fs.readFile(sourceURL, (err, bufferOrString) => {
		if (err)
			return callback(
				new Error(`Failed to parse source map from '${sourceURL}' file: ${err}`)
			);
		callback(null, { path: sourceURL, data: bufferOrString.toString("utf-8") });
	});
}

function fetchPathsFromFilesystem(
	fs,
	possibleRequests,
	errorsAccumulator = "",
	callback
) {
	const cb = (error, result) => {
		if (error) {
			errorsAccumulator += `${error.message}\n\n`;

			const tailPossibleRequests = possibleRequests.slice(1);

			if (tailPossibleRequests.length === 0) {
				error.message = errorsAccumulator;

				return callback(error);
			}

			return fetchPathsFromFilesystem(
				fs,
				tailPossibleRequests,
				errorsAccumulator,
				cb
			);
		}
		callback(null, result);
	};
	fetchFromFilesystem(fs, possibleRequests[0], cb);
}

/**
 * @param {InputFileSystem} fs fs
 * @param {string} context context
 * @param {string} url url
 * @param {boolean} skipReading skip reading
 * @param {function (Error|null, {sourceURL: string, sourceContent?: string}=): void} callback callback
 * @returns {void}
 */
function fetchFromURL(fs, context, url, skipReading, callback) {
	// 1. It's an absolute url and it is not `windows` path like `C:\dir\file`
	if (/^[a-z][a-z0-9+.-]*:/i.test(url) && !path.win32.isAbsolute(url)) {
		const { protocol } = new urlUtils.URL(url);

		if (protocol === "data:") {
			if (skipReading) return callback(null, { sourceURL: "" });
			return fetchFromDataURL(url, (err, sourceContent) => {
				if (err) return callback(err);
				callback(null, { sourceURL: "", sourceContent });
			});
		} else if (protocol === "file:") {
			const sourceURL = urlUtils.fileURLToPath(url);
			if (skipReading) return callback(null, { sourceURL });
			return fetchFromFilesystem(fs, sourceURL, (err, result) => {
				if (err) return callback(err);
				const { data: sourceContent } = result;
				callback(null, { sourceURL, sourceContent });
			});
		} else {
			return callback(
				new Error(`Failed to parse source map: '${url}' URL is not supported`)
			);
		}
	}

	// 2. It's a scheme-relative
	if (/^\/\//.test(url)) {
		return callback(
			new Error(`Failed to parse source map: '${url}' URL is not supported`)
		);
	}

	// 3. Absolute path
	if (isAbsolute(url)) {
		if (skipReading) return callback(null, { sourceURL: url });
		const possibleRequests = [url];

		if (url.startsWith("/") || url.startsWith("\\")) {
			possibleRequests.push(getAbsolutePath(fs, context, url.slice(1)));
		}

		fetchPathsFromFilesystem(fs, possibleRequests, "", (err, result) => {
			if (err) return callback(err);
			const { path: sourceURL, data: sourceContent } = result;
			callback(null, { sourceURL, sourceContent });
		});
	} else {
		// 4. Relative path
		const sourceURL = getAbsolutePath(fs, context, url);
		if (skipReading) return callback(null, { sourceURL });

		fetchFromFilesystem(fs, sourceURL, (err, result) => {
			if (err) return callback(err);
			const { data: sourceContent } = result;
			callback(null, { sourceURL, sourceContent });
		});
	}
}

/**
 * @param {string} input input data
 * @param {InputFileSystem} fs filesystem
 * @param {NormalModule} module normal module
 * @param {boolean} removeOnly should only remove source map comment
 * @param {(err: Error|null, code?: string, sourceMap?: object) => void} callback callback
 */
module.exports = function extractSourceMap(
	input,
	fs,
	module,
	removeOnly,
	callback
) {
	const { sourceMappingURL, replacementString } = getSourceMappingURL(input);

	if (!sourceMappingURL) {
		callback(null, input);
		return;
	} else if (removeOnly) {
		callback(null, input.replace(replacementString, ""));
		return;
	}

	fetchFromURL(
		fs,
		module.context || "",
		sourceMappingURL,
		false,
		(err, result) => {
			if (err) return callback(err);
			const { sourceURL, sourceContent } = result;

			if (sourceURL && module.buildInfo && module.buildInfo.fileDependencies) {
				module.buildInfo.fileDependencies.add(sourceURL);
			}

			let map;

			try {
				map = JSON.parse(sourceContent.replace(/^\)\]\}'/, ""));
			} catch (parseError) {
				return callback(
					new WebpackError(
						`Failed to parse source map from '${sourceMappingURL}': ${parseError}`
					)
				);
			}

			if (map.sources && map.sources.length > 0) {
				const promises = [];
				for (let i = 0; i < map.sources.length; i++) {
					const k = i;
					promises.push(
						new Promise(resolve => {
							const skipReading =
								map.sourcesContent[k] !== null &&
								map.sourcesContent[k] !== undefined;
							fetchFromURL(
								fs,
								module.context || "",
								map.sources[k],
								skipReading,
								(err, result) => {
									if (err) {
										return resolve(map.sourcesContent[k] || null);
									}

									const { sourceURL, sourceContent } = result;

									if (
										sourceURL &&
										module.buildInfo &&
										module.buildInfo.fileDependencies
									) {
										module.buildInfo.fileDependencies.add(sourceURL);
									}

									resolve(map.sourcesContent[k] || sourceContent || null);
								}
							);
						})
					);
				}
				if (promises.length) {
					return Promise.all(promises).then(sourcesContent => {
						map.sourcesContent = sourcesContent;
						callback(null, input.replace(replacementString, ""), map);
					});
				}
			}

			return callback(null, input.replace(replacementString, ""), map);
		}
	);
};
