/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("../errors/WebpackError");

/** @import Compiler from "../Compiler" */
/** @import { AssetInfo } from "../Compilation" */

const PLUGIN_NAME = "WarnHashDigestInFilenamePlugin";

/** @type {("fullhash" | "chunkhash" | "modulehash" | "contenthash")[]} */
const HASH_KEYS = ["fullhash", "chunkhash", "modulehash", "contenthash"];

/**
 * Whether an asset's name holds one of the hashes its info records.
 * @param {string} name asset name
 * @param {AssetInfo} info asset info
 * @returns {boolean} true, when a hash is part of the name
 */
const hasHashInName = (name, info) => {
	for (const key of HASH_KEYS) {
		const value = info[key];
		if (value === undefined) continue;
		for (const hash of Array.isArray(value) ? value : [value]) {
			if (hash && name.includes(hash)) return true;
		}
	}
	return false;
};

class WarnHashDigestInFilenamePlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.afterProcessAssets.tap(PLUGIN_NAME, () => {
				for (const { name, info } of compilation.getAssets()) {
					if (!hasHashInName(name, info)) continue;
					const warning = new WebpackError(
						`output.hashDigest "${compilation.outputOptions.hashDigest}" can put "/" in a hash, and the asset ${JSON.stringify(name)} has a hash in its name. ` +
							"Such a file lands one directory deeper than its template says, and paths the runtime computes from it, such as an automatic public path, break. " +
							'Use output.hashDigest "base64url".'
					);
					warning.name = "HashDigestInFilenameWarning";
					compilation.warnings.push(warning);
					return;
				}
			});
		});
	}
}

module.exports = WarnHashDigestInFilenamePlugin;
