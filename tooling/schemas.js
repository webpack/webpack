/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const fs = require("fs");
const path = require("path");
const findCommonDir = require("commondir");
const { globSync } = require("glob");
const { root, schemas: schemasGlob } = require("./argv");

/**
 * A schema node holds arbitrary JSON, so its values have no narrower type.
 * @typedef {{ [key: string]: EXPECTED_ANY }} Schema
 */

/**
 * @typedef {object} SchemaFile
 * @property {string} absPath absolute path of the schema
 * @property {string} relPath path relative to the directory every schema shares
 * @property {string} basename the schema's name without its extension
 * @property {() => Schema} parse the file's own copy of the parsed schema
 */

/**
 * Reads every schema from disk once; each consumer parses its own copy, because
 * the declaration pass rewrites the tree the validator pass reads.
 * @returns {SchemaFile[]} every schema, ordered by path
 */
const loadSchemas = () => {
	const absPaths = globSync(schemasGlob, { cwd: root, absolute: true }).sort();
	const commonDir = path.resolve(findCommonDir(absPaths));
	return absPaths.map((absPath) => {
		const content = fs.readFileSync(absPath, "utf8");
		return {
			absPath,
			relPath: path.relative(commonDir, absPath),
			basename: path.basename(absPath, path.extname(absPath)),
			parse: () => JSON.parse(content)
		};
	});
};

module.exports = loadSchemas;
