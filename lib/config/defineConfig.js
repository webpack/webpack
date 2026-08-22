/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/**
 * @import {
 * 	WebpackOptions as Configuration
 * } from "../../declarations/WebpackOptions"
 */
/**
 * @import {
 * 	MultiWebpackOptions as MultiConfiguration
 * } from "../MultiCompiler"
 */

/**
 * @template T
 * @typedef {T | Promise<T>} MaybePromise
 */

/**
 * Function style configuration, called with the `--env` values and CLI arguments.
 * @typedef {(env: Record<string, EXPECTED_ANY>, argv: Record<string, EXPECTED_ANY>) => MaybePromise<Configuration | MultiConfiguration>} ConfigurationFactory
 */

/** @typedef {MaybePromise<Configuration | MultiConfiguration | ConfigurationFactory | ConfigurationFactory[]>} DefineConfigInput */

/**
 * A type helper for authoring configuration files, no-op at runtime.
 * @template {DefineConfigInput} T
 * @param {T} config webpack configuration
 * @returns {T} the same configuration
 */
const defineConfig = (config) => config;

module.exports = defineConfig;
