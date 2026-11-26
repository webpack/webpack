"use strict";

/** @import { Chunk as GenericChunk, PathData as GenericPathData, Configuration } from "../../../../" */

/** @typedef {GenericChunk & { name: string }} Chunk */
/** @typedef {GenericPathData & { chunk: Chunk }} PathData */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	entry: {
		a: "./a",
		b: {
			import: "./b",
			/**
			 * @param {PathData} data data
			 * @returns {string} filename
			 */
			filename: (data) =>
				`${data.chunk.name + data.chunk.name + data.chunk.name}.js`
		}
	},
	output: {
		/**
		 * @param {PathData} data data
		 * @returns {string} filename
		 */
		filename: (data) => `${data.chunk.name + data.chunk.name}.js`,
		/**
		 * @param {PathData} data data
		 * @returns {string} filename
		 */
		chunkFilename: (data) => `${data.chunk.name + data.chunk.name}.js`
	}
};
