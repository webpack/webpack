/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const asyncLib = require("neo-async");
const path = require("path");
const urlUtils = require("url");
const { SourceMapSource } = require("webpack-sources");
const WebpackError = require("./WebpackError");
const ConstDependency = require("./dependencies/ConstDependency");
const { isAbsolute, join } = require("./util/fs");

/** @typedef {import("estree").Comment} CommentNode */
/** @typedef {import("../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("./util/fs").InputFileSystem} InputFileSystem */

// Matches only the last occurrence of sourceMappingURL
const sourceMappingURLRegex = /\s*[#@]\s*sourceMappingURL\s*=\s*([^\s'"]*)\s*/;

/**
 * @param {CommentNode[]} comments comments
 * @returns {{sourceMappingURL: string, node: CommentNode}|undefined} source mapping
 */
function getSourceMappingURL(comments) {
	let match;
	let comment;
	for (let i = comments.length - 1; i >= 0; i--) {
		comment = comments[i];
		if (comment.type === "Block") continue;
		match = comment.value.match(sourceMappingURLRegex);
		if (match) break;
	}

	if (!match) return;

	const sourceMappingURL = match[1] || match[2] || "";

	return {
		sourceMappingURL: sourceMappingURL
			? decodeURI(sourceMappingURL)
			: sourceMappingURL,
		node: comment
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
 * @param {string|undefined} sourceRoot source root
 * @param {function (Error|null, {sourceURL: string, sourceContent: string}=): void} callback callback
 * @returns {void}
 */
function fetchFromURL(fs, context, url, sourceRoot, callback) {
	// 1. It's an absolute url and it is not `windows` path like `C:\dir\file`
	if (/^[a-z][a-z0-9+.-]*:/i.test(url) && !path.win32.isAbsolute(url)) {
		const { protocol } = new urlUtils.URL(url);

		if (protocol === "data:") {
			fetchFromDataURL(url, (err, sourceContent) => {
				if (err) return callback(err);
				callback(null, { sourceURL: "", sourceContent });
			});
		} else if (protocol === "file:") {
			const sourceURL = urlUtils.fileURLToPath(url);
			fetchFromFilesystem(fs, sourceURL, (err, result) => {
				if (err) return callback(err);
				const { data: sourceContent } = result;
				callback(null, { sourceURL, sourceContent });
			});
		} else {
			callback(
				new Error(`Failed to parse source map: '${url}' URL is not supported`)
			);
		}
		return;
	}

	// 2. It's a scheme-relative
	if (/^\/\//.test(url)) {
		return callback(
			new Error(`Failed to parse source map: '${url}' URL is not supported`)
		);
	}

	// 3. Absolute path
	if (isAbsolute(url)) {
		const possibleRequests = [url];

		if (url.startsWith("/") || url.startsWith("\\")) {
			possibleRequests.push(
				getAbsolutePath(fs, context, url.slice(1), sourceRoot)
			);
		}

		fetchPathsFromFilesystem(fs, possibleRequests, "", (err, result) => {
			if (err) return callback(err);
			const { path: sourceURL, data: sourceContent } = result;
			callback(null, { sourceURL, sourceContent });
		});
	} else {
		// 4. Relative path
		const sourceURL = getAbsolutePath(fs, context, url, sourceRoot);

		fetchFromFilesystem(fs, sourceURL, (err, result) => {
			if (err) return callback(err);
			const { data: sourceContent } = result;
			callback(null, { sourceURL, sourceContent });
		});
	}
}

class ExtractSourceMapPlugin {
	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"ExtractSourceMapPlugin",
			(compilation, { normalModuleFactory }) => {
				const modules = [];
				/**
				 * @param {JavascriptParser} parser parser
				 * @param {JavascriptParserOptions} parserOptions parser options
				 */
				const handlerJavascript = (parser, parserOptions) => {
					if (parserOptions.extractSourceMap !== true) return;

					parser.hooks.finish.tap("ExtractSourceMapPlugin", (_, comments) => {
						const mapping = getSourceMappingURL(comments);
						if (!mapping || !mapping.sourceMappingURL) return;
						const { node, sourceMappingURL } = mapping;
						const module = parser.state.module;

						const dep = new ConstDependency(
							"// extracted source map",
							node.range
						);
						dep.loc = node.loc;
						module.addPresentationalDependency(dep);

						if (!module.useSourceMap || !("setSourceMap" in module)) return;
						const source = module.originalSource();
						if (!source) return;
						if (source instanceof SourceMapSource) {
							const warnings = new WebpackError(
								"ExtractSourceMapPlugin: Source already has source map."
							);
							warnings.details =
								"It maybe caused by using 'source-map-loader'.\nRemove it from configuration and try again.";
							warnings.loc = node.loc;
							module.addWarning(warnings);
							return;
						}

						modules.push([module, sourceMappingURL]);
					});
				};

				compilation.hooks.finishModules.tapAsync(
					"ExtractSourceMapPlugin",
					(_, callback) => {
						if (modules.length === 0) return callback();
						asyncLib.each(
							modules,
							([module, sourceMappingURL], callback) => {
								fetchFromURL(
									compiler.inputFileSystem,
									module.context || "",
									sourceMappingURL,
									"",
									(err, result) => {
										if (err) {
											module.addWarning(err);
											return callback();
										}
										const { sourceURL, sourceContent } = result;

										if (module.buildInfo && module.buildInfo.fileDependencies) {
											module.buildInfo.fileDependencies.add(sourceURL);
										}

										let map;

										try {
											map = JSON.parse(sourceContent.replace(/^\)\]\}'/, ""));
										} catch (parseError) {
											module.addWarning(
												new WebpackError(
													`Failed to parse source map from '${sourceMappingURL}': ${parseError}`
												)
											);
											return callback();
										}

										// if (map.sections) {
										// map = await flattenSourceMap(map);
										// }
										// add source content?
										module.setSourceMap(map, compiler.context);
										return callback();
									}
								);
							},
							callback
						);
					}
				);

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("ExtractSourceMapPlugin", handlerJavascript);
				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("ExtractSourceMapPlugin", handlerJavascript);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("ExtractSourceMapPlugin", handlerJavascript);
			}
		);
	}
}

module.exports = ExtractSourceMapPlugin;
