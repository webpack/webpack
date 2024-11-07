/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

import { HotUpdateChunk, Chunk } from "..";
import { getUndoPath } from "../util/identifier";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const { isSubset } = require("../util/SetHelpers");
const { getAllChunks } = require("./ChunkHelpers");
const {chunkHasJs} =require("../RuntimeGlobals");
const {federationStartup} = require("../RuntimeGlobals");



/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Chunk").ChunkId} ChunkId */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../ChunkGraph").ModuleId} ModuleId */
/** @typedef {import("../Entrypoint")} Entrypoint */
/** @typedef {import("../ChunkGraph").EntryModuleWithChunkGroup} EntryModuleWithChunkGroup */
/** @typedef {import("../ChunkGroup")} ChunkGroup */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {(string|number)[]} EntryItem */

const EXPORT_PREFIX = `var ${RuntimeGlobals.exports} = `;

/** @typedef {Set<Chunk>} Chunks */
/** @typedef {ModuleId[]} ModuleIds */

/**
 * @param {ChunkGraph} chunkGraph chunkGraph
 * @param {RuntimeTemplate} runtimeTemplate runtimeTemplate
 * @param {EntryModuleWithChunkGroup[]} entries entries
 * @param {Chunk} chunk chunk
 * @param {boolean} passive true: passive startup with on chunks loaded
 * @returns {string} runtime code
 */
module.exports.generateEntryStartup = (
	chunkGraph,
	runtimeTemplate,
	entries,
	chunk,
	passive
) => {
	/** @type {string[]} */
	const runtime = [
		`var __webpack_exec__ = ${runtimeTemplate.returningFunction(
			`${RuntimeGlobals.require}(${RuntimeGlobals.entryModuleId} = moduleId)`,
			"moduleId"
		)}`
		,
    '',
    '\n',
    'var promises = [];',
	];

	const treeRuntimeRequirements = chunkGraph.getTreeRuntimeRequirements(chunk);
  const chunkRuntimeRequirements =
    chunkGraph.getChunkRuntimeRequirements(chunk);
  const federation =
    chunkRuntimeRequirements.has(federationStartup) ||
    treeRuntimeRequirements.has(federationStartup);


	/**
	 * @param {ModuleId} id id
	 * @returns {string} fn to execute
	 */
	const runModule = id => `__webpack_exec__(${JSON.stringify(id)})`;
	/**
	 * @param {Chunks} chunks chunks
	 * @param {ModuleIds} moduleIds module ids
	 * @param {boolean=} final true when final, otherwise false
	 */
	const outputCombination = (chunks, moduleIds, final) => {
		if (chunks.size === 0) {
			runtime.push(
				`${final ? EXPORT_PREFIX : ""}(${moduleIds.map(runModule).join(", ")});`
			);
		} else {
			const fn = runtimeTemplate.returningFunction(
				moduleIds.map(runModule).join(", ")
			);
			if (federation) {
				const chunkIds = Array.from(chunks, (c) => c.id);
		
				const wrappedInit = (/** @type {string} */ body) =>
				  Template.asString([
					'Promise.all([',
					Template.indent([
					  // may have other chunks who depend on federation, so best to just fallback
					  // instead of try to figure out if consumes or remotes exists during build
					  `${RuntimeGlobals.ensureChunkHandlers}.consumes || function(chunkId, promises) {},`,
					  `${RuntimeGlobals.ensureChunkHandlers}.remotes || function(chunkId, promises) {},`,
					]),
					`].reduce(${runtimeTemplate.returningFunction(`handler('${chunk.id}', p), p`, 'p, handler')}, promises)`,
					`).then(${runtimeTemplate.returningFunction(body)});`,
				  ]);
	
				const wrap = wrappedInit(
				  `${
					passive
					  ? RuntimeGlobals.onChunksLoaded
					  : RuntimeGlobals.startupEntrypoint
				  }(0, ${JSON.stringify(chunkIds)}, ${fn})`,
				);

				runtime.push(`${final && !passive ? EXPORT_PREFIX : ''}${wrap}`);
      } else {
        
        const chunkIds = Array.from(chunks, (c) => c.id);
			runtime.push(
				`${final && !passive ? EXPORT_PREFIX : ""}$
					passive
						? RuntimeGlobals.onChunksLoaded
						: RuntimeGlobals.startupEntrypoint
				}(0, ${JSON.stringify(Array.from(chunks, c => c.id))}, ${fn});`
			);
			if (final && passive) {
				runtime.push(`${EXPORT_PREFIX}${RuntimeGlobals.onChunksLoaded}();`);
			}
		}
	}	
	};

	/** @type {Chunks | undefined} */
	let currentChunks;
	/** @type {ModuleIds | undefined} */
	let currentModuleIds;

	for (const [module, entrypoint] of entries) {
		const runtimeChunk =
			/** @type {Entrypoint} */
			(entrypoint).getRuntimeChunk();
		const moduleId = /** @type {ModuleId} */ (chunkGraph.getModuleId(module));
		const chunks = getAllChunks(
			/** @type {Entrypoint} */
			(entrypoint),
			chunk,
			runtimeChunk
		);
		if (
			currentChunks &&
			currentChunks.size === chunks.size &&
			isSubset(currentChunks, chunks)
		) {
			/** @type {ModuleIds} */
			(currentModuleIds).push(moduleId);
		} else {
			if (currentChunks) {
				outputCombination(
					currentChunks,
					/** @type {ModuleIds} */ (currentModuleIds)
				);
			}
			currentChunks = chunks;
			currentModuleIds = [moduleId];
		}
	}

	// output current modules with export prefix
	if (currentChunks) {
		outputCombination(
			currentChunks,
			/** @type {ModuleIds} */
			(currentModuleIds),
			true
		);
	}
	runtime.push("");
	return Template.asString(runtime);
};

/**
 * @param {Hash} hash the hash to update
 * @param {ChunkGraph} chunkGraph chunkGraph
 * @param {EntryModuleWithChunkGroup[]} entries entries
 * @param {Chunk} chunk chunk
 * @returns {void}
 */
module.exports.updateHashForEntryStartup = (
	hash,
	chunkGraph,
	entries,
	chunk
) => {
	for (const [module, entrypoint] of entries) {
		const runtimeChunk =
			/** @type {Entrypoint} */
			(entrypoint).getRuntimeChunk();
		const moduleId = chunkGraph.getModuleId(module);
		hash.update(`${moduleId}`);
		for (const c of getAllChunks(
			/** @type {Entrypoint} */ (entrypoint),
			chunk,
			/** @type {Chunk} */ (runtimeChunk)
		)) {
			hash.update(`${c.id}`);
		}
	}
};

export const generateESMEntryStartup = (
	/** @type {{ compiler: { webpack: { JavascriptModulesPlugin: { chunkHasJs: any; getChunkFilenameTemplate: any; }; sources: { ConcatSource: any; }; }; }; getPath: (arg0: any, arg1: { chunk: any; contentHashType: string; }) => string; outputOptions: any; }} */ compilation,
	// @ts-ignore
	/** @type {{ getTreeRuntimeRequirements: (arg0: any) => any; getChunkRuntimeRequirements: (arg0: any) => any; getModuleId: (arg0: any) => string; }} */ chunkGraph,
	/** @type {{ returningFunction: (arg0: string, arg1: string) => any; }} */ runtimeTemplate,
	/** @type {string | any[]} */ entries,
	/** @type {import("../Chunk")} */ chunk,
	/** @type {any} */ passive,
  ) => {
	const { chunkHasJs, getChunkFilenameTemplate } =
	  compilation.compiler.webpack.JavascriptModulesPlugin;
	const { ConcatSource } = compilation.compiler.webpack.sources;
	const hotUpdateChunk = chunk instanceof HotUpdateChunk ? chunk : null;
	if (hotUpdateChunk) {
	  throw new Error('HMR is not implemented for module chunk format yet');
	} else {
	  const treeRuntimeRequirements =
		chunkGraph.getTreeRuntimeRequirements(chunk);
	  const chunkRuntimeRequirements =
		chunkGraph.getChunkRuntimeRequirements(chunk);
	  const federation =
		chunkRuntimeRequirements.has(federationStartup) ||
		treeRuntimeRequirements.has(federationStartup);
	  if (entries.length > 0) {
		const runtimeChunk = entries[0]?.[1]?.getRuntimeChunk?.();
		if (!runtimeChunk) {
		  throw new Error('Runtime chunk is undefined');
		}
		const currentOutputName = compilation
		  .getPath(getChunkFilenameTemplate(chunk, compilation.outputOptions), {
			chunk,
			contentHashType: 'javascript',
		  })
		  .replace(/^\/+/g, '')
		  .split('/');
  
		/**
		 * @param {Chunk} chunk the chunk
		 * @returns {string} the relative path
		 */
		const getRelativePath = (chunk) => {
		  const baseOutputName = currentOutputName.slice();
		  const chunkOutputName = compilation
			.getPath(getChunkFilenameTemplate(chunk, compilation.outputOptions), {
			  chunk,
			  contentHashType: 'javascript',
			})
			.replace(/^\/+/g, '')
			.split('/');
  
		  // remove common parts except filename
		  while (
			baseOutputName.length > 1 &&
			chunkOutputName.length > 1 &&
			baseOutputName[0] === chunkOutputName[0]
		  ) {
			baseOutputName.shift();
			chunkOutputName.shift();
		  }
		  const last = chunkOutputName.join('/');
		  // create final path
		  return getUndoPath(baseOutputName.join('/'), last, true) + last;
		};
  
		const startupSource = new ConcatSource();
		startupSource.add(
		  `var __webpack_exec__ = ${runtimeTemplate.returningFunction(
			`${RuntimeGlobals.require}(${RuntimeGlobals.entryModuleId} = moduleId)`,
			'moduleId',
		  )}\n`,
		);
  
		// @ts-ignore
		const loadedChunks = new Set(chunk);;
		let index = 0;
		for (let i = 0; i < entries.length; i++) {
		  const [module, entrypoint] = entries[i];
		  if (!entrypoint) continue;
		  const final = i + 1 === entries.length;
		  const moduleId = chunkGraph.getModuleId(module);
		  const chunks = getAllChunks(entrypoint, runtimeChunk, undefined);
		  for (const chunk of chunks) {
			if (loadedChunks.has(chunk) || !chunkHasJs(chunk, chunkGraph))
			  continue;
			loadedChunks.add(chunk);
			startupSource.add(
			  `import * as __webpack_chunk_${index}__ from ${JSON.stringify(
				getRelativePath(chunk),
			  )};\n`,
			);
			startupSource.add(
			  `${RuntimeGlobals.externalInstallChunk}(__webpack_chunk_${index}__);\n`,
			);
			index++;
		  }
		  // generateEntryStartup handles calling require and execution of the entry module.
		  if (!federation) {
			startupSource.add(
			  `${
				final ? EXPORT_PREFIX : ''
			  }__webpack_exec__(${JSON.stringify(moduleId)});\n`,
			);
		  }
		}
	}
 }
  };
  
  
/**
 * @param {Chunk} chunk the chunk
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @param {function(Chunk, ChunkGraph): boolean} filterFn filter function
 * @returns {Set<number | string>} initially fulfilled chunk ids
 */
module.exports.getInitialChunkIds = (chunk, chunkGraph, filterFn) => {
	const initialChunkIds = new Set(chunk.ids);
	for (const c of chunk.getAllInitialChunks()) {
		if (c === chunk || filterFn(c, chunkGraph)) continue;
		for (const id of /** @type {ChunkId[]} */ (c.ids)) {
			initialChunkIds.add(id);
		}
	}
	return initialChunkIds;
};
