/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const NullDependency = require("./NullDependency");

/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency").ExportSpec} ExportSpec */
/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../json/JsonData")} JsonData */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../util/Hash")} Hash */

const getExportsFromData = data => {
	if (data && typeof data === "object") {
		if (Array.isArray(data)) {
			return data.length < 100
				? data.map((item, idx) => {
						return {
							name: `${idx}`,
							canMangle: true,
							exports: getExportsFromData(item)
						};
				  })
				: undefined;
		} else {
			const exports = [];
			for (const key of Object.keys(data)) {
				exports.push({
					name: key,
					canMangle: true,
					exports: getExportsFromData(data[key])
				});
			}
			return exports;
		}
	}
	return undefined;
};

class JsonExportsDependency extends NullDependency {
	/**
	 * @param {JsonData=} data json data
	 */
	constructor(data) {
		super();
		this.data = data;
	}

	get type() {
		return "json exports";
	}

	/**
	 * Returns the exported names
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {ExportsSpec | undefined} export names
	 */
	getExports(moduleGraph) {
		return {
			exports: getExportsFromData(this.data && this.data.get()),
			dependencies: undefined
		};
	}

	/**
	 * Update the hash
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		this.data.updateHash(hash);
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.data);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.data = read();
		super.deserialize(context);
	}
}

makeSerializable(
	JsonExportsDependency,
	"webpack/lib/dependencies/JsonExportsDependency"
);

module.exports = JsonExportsDependency;
