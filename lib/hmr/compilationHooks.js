/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { SyncHook } = require("tapable");
const createHooksRegistry = require("../util/createHooksRegistry");

/** @import Compilation from "../Compilation" */
/** @import Chunk, { ChunkId } from "../graph/Chunk" */
/** @import { ModuleId } from "../graph/ChunkGraph" */

/**
 * The manifest a runtime downloads first in a hot update; every download handler gets it
 * whole, so a plugin adds a field here for its own handler.
 * @typedef {{ c: ChunkId[], r: ChunkId[], m: ModuleId[], f?: ChunkId[], s?: ModuleId[], [key: string]: unknown }} HotUpdateManifest
 */

/**
 * What a plugin needs to fill its manifest field.
 * @typedef {object} HotUpdateManifestContext
 * @property {Compilation} compilation the compilation
 * @property {Chunk[]} chunks the updated chunks that are still in this build
 * @property {(chunk: Chunk) => Chunk[]} joinedSiblings the chunks that joined one of the chunk's groups since the last build, which the runtime never loads on its own
 */

/**
 * The hooks `HotModuleReplacementPlugin` calls on a compilation.
 * @typedef {object} HotModuleReplacementCompilationHooks
 * @property {SyncHook<[HotUpdateManifest, HotUpdateManifestContext]>} updateManifest called for each hot update manifest before it is emitted
 */

/** @type {(compilation: Compilation) => HotModuleReplacementCompilationHooks} */
const getCompilationHooks = createHooksRegistry(() => ({
	updateManifest: new SyncHook(["manifest", "context"])
}));

module.exports = getCompilationHooks;
