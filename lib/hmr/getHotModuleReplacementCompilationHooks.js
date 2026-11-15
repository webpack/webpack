/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { SyncHook } = require("tapable");
const createHooksRegistry = require("../util/createHooksRegistry");

/** @import { HotUpdateManifest, HotUpdateManifestContext } from "./HotModuleReplacementPlugin" */

const createCompilationHooks = () => ({
	/**
	 * Called for each hot update manifest before it is emitted; add a field for your own download handler, which gets the whole manifest.
	 * @type {SyncHook<[HotUpdateManifest, HotUpdateManifestContext]>}
	 * @since 5.113.0
	 */
	updateManifest: new SyncHook(["manifest", "context"])
});

// Apart from the plugin, so a plugin tapping these in every build loads only
// them, not the plugin and its runtime modules.
module.exports = createHooksRegistry(createCompilationHooks);
