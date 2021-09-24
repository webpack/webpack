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
/** @typedef {import("../util/Hash")} Hash */

const getExportsFromData = data => {
	if (data && typeof data === "object") {
		if (Array.isArray(data)) {
			return data.map((item, idx) => {
				return {
					name: `${idx}`,
					canMangle: true,
					exports: getExportsFromData(item)
				};
			});
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
	 * @param {(string | ExportSpec)[]} exports json exports
	 */
	constructor(exports) {
		super();
		this.exports = exports;
		this._hashUpdate = undefined;
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
			exports: this.exports,
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
		if (this._hashUpdate === undefined) {
			this._hashUpdate = this.exports
				? JSON.stringify(this.exports)
				: "undefined";
		}
		hash.update(this._hashUpdate);
	}

	serialize(context) {
		const { write } = context;
		write(this.exports);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this.exports = read();
		super.deserialize(context);
	}
}

makeSerializable(
	JsonExportsDependency,
	"webpack/lib/dependencies/JsonExportsDependency"
);

module.exports = JsonExportsDependency;
module.exports.getExportsFromData = getExportsFromData;
