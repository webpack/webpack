/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

/** @typedef {import("../logging/Logger").Logger} Logger */
/** @typedef {import("../util/fs").IntermediateFileSystem} IntermediateFileSystem */

/**
 * @typedef {Object} CacheStrategyOptions
 * @property {IntermediateFileSystem} fs the filesystem
 * @property {string} context the context directory
 * @property {boolean} contextify write/read paths as is or contextify relative to cache folder
 * @property {string} cacheLocation the location of the cache data
 * @property {string} version version identifier
 * @property {Logger} logger a logger
 * @property {Iterable<string>} managedPaths paths managed only by package manager
 * @property {Iterable<string>} immutablePaths immutable paths
 */

/**
 * @typedef {Object} CacheWriteReadAbsolutePath
 * @property {(s: string) => string} writeAbsolutePath
 * @property {(s: Set<string>) => Set<string>} writeAbsolutePaths
 * @property {(s: string) => string} readAbsolutePath
 * @property {(s: Set<string>) => Set<string>} readAbsolutePaths
 */

module.exports = "";
