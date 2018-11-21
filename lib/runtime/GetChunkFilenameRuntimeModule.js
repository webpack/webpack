/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

class GetChunkFilenameRuntimeModule extends RuntimeModule {
	constructor(compilation, chunk, contentType, global, filename) {
		super(`get chunk ${contentType} filename`);
		this.compilation = compilation;
		this.chunk = chunk;
		this.contentType = contentType;
		this.global = global;
		this.filename = filename;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { global, chunk, contentType, filename, compilation } = this;
		const mainTemplate = compilation.mainTemplate;
		const chunkMaps = chunk.getChunkMaps();
		const url = mainTemplate.getAssetPath(JSON.stringify(filename), {
			hash: `" + ${RuntimeGlobals.getFullHash}() + "`,
			hashWithLength: length =>
				`" + ${RuntimeGlobals.getFullHash}().slice(0, ${length}) + "`,
			chunk: {
				id: `" + chunkId + "`,
				hash: `" + ${JSON.stringify(chunkMaps.hash)}[chunkId] + "`,
				hashWithLength(length) {
					const shortChunkHashMap = Object.create(null);
					for (const chunkId of Object.keys(chunkMaps.hash)) {
						if (typeof chunkMaps.hash[chunkId] === "string") {
							shortChunkHashMap[chunkId] = chunkMaps.hash[chunkId].substr(
								0,
								length
							);
						}
					}
					return `" + ${JSON.stringify(shortChunkHashMap)}[chunkId] + "`;
				},
				name: `" + (${JSON.stringify(chunkMaps.name)}[chunkId]||chunkId) + "`,
				contentHash: {
					[contentType]: `" + ${JSON.stringify(
						chunkMaps.contentHash[contentType]
					)}[chunkId] + "`
				},
				contentHashWithLength: {
					[contentType]: length => {
						const shortContentHashMap = {};
						const contentHash = chunkMaps.contentHash[contentType];
						for (const chunkId of Object.keys(contentHash)) {
							if (typeof contentHash[chunkId] === "string") {
								shortContentHashMap[chunkId] = contentHash[chunkId].substr(
									0,
									length
								);
							}
						}
						return `" + ${JSON.stringify(shortContentHashMap)}[chunkId] + "`;
					}
				}
			},
			contentHashType: contentType
		});
		return Template.asString([
			`${global} = function(chunkId) {`,
			Template.indent([`return ${url};`]),
			"};"
		]);
	}
}

module.exports = GetChunkFilenameRuntimeModule;
