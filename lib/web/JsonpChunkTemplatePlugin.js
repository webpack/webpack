/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Template = require("../Template");
const { ConcatSource } = require("webpack-sources");

/** @typedef {import("../ChunkTemplate")} ChunkTemplate */

const getEntryInfo = chunk => {
	return [chunk.entryModule].filter(Boolean).map(m =>
		[m.id].concat(
			Array.from(chunk.groupsIterable)[0]
				.chunks.filter(c => c !== chunk)
				.map(c => c.id)
		)
	);
};

class JsonpChunkTemplatePlugin {
	/**
	 * @param {ChunkTemplate} chunkTemplate the chunk template
	 * @returns {void}
	 */
	apply(chunkTemplate) {
		chunkTemplate.hooks.render.tap(
			"JsonpChunkTemplatePlugin",
			(modules, chunk) => {
				const jsonpFunction = chunkTemplate.outputOptions.jsonpFunction;
				const globalObject = chunkTemplate.outputOptions.globalObject;
				const source = new ConcatSource();
				let externals = [];

				if (!chunk.entryModule) {
					externals = []
						.concat(
							...chunk
								.getModules()
								.map(m =>
									m.dependencies.filter(
										d => d.module && d.module.externalType === "amd"
									)
								)
						)
						.map(d => d.module);

					externals = externals.filter(function(value, index, self) {
						return self.indexOf(value) === index && value;
					});
				}

				const externalsDepsArray = JSON.stringify(
					externals.map(m =>
						typeof m.request === "object" ? m.request.amd : m.request
					)
				);

				const externalsArguments = externals
					.map(
						m =>
							`__WEBPACK_EXTERNAL_MODULE_${Template.toIdentifier(
								`${m.request}`
							)}__`
					)
					.join(", ");

				if (externals.length > 0) {
					source.add(
						`require(${externalsDepsArray}, function(${externalsArguments}) {`
					);
				}

				const prefetchChunks = chunk.getChildIdsByOrders().prefetch;
				source.add(
					`(${globalObject}[${JSON.stringify(
						jsonpFunction
					)}] = ${globalObject}[${JSON.stringify(
						jsonpFunction
					)}] || []).push([${JSON.stringify(chunk.ids)},`
				);
				source.add(modules);
				const entries = getEntryInfo(chunk);
				if (entries.length > 0) {
					source.add(`,${JSON.stringify(entries)}`);
				} else if (prefetchChunks && prefetchChunks.length) {
					source.add(`,0`);
				}

				if (prefetchChunks && prefetchChunks.length) {
					source.add(`,${JSON.stringify(prefetchChunks)}`);
				}
				source.add("])");
				if (externals.length > 0) {
					source.add("});");
				}

				return source;
			}
		);
		chunkTemplate.hooks.hash.tap("JsonpChunkTemplatePlugin", hash => {
			hash.update("JsonpChunkTemplatePlugin");
			hash.update("4");
			hash.update(`${chunkTemplate.outputOptions.jsonpFunction}`);
			hash.update(`${chunkTemplate.outputOptions.globalObject}`);
		});
		chunkTemplate.hooks.hashForChunk.tap(
			"JsonpChunkTemplatePlugin",
			(hash, chunk) => {
				hash.update(JSON.stringify(getEntryInfo(chunk)));
				hash.update(JSON.stringify(chunk.getChildIdsByOrders().prefetch) || "");
			}
		);
	}
}
module.exports = JsonpChunkTemplatePlugin;
