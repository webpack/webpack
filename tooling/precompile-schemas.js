/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// Compile every `schemas/**/*.json` into the standalone check webpack
// validates options with, as `schemas/**/*.check.js`.
//
//   node tooling/precompile-schemas.js          # report what is stale
//   node tooling/precompile-schemas.js --write  # write those checks
//
// WHY: webpack validates against generated code rather than carrying `ajv` at
// runtime, so the checks are committed and a check run names a stale one.
// `schema-utils` compiles them, the same way it compiles a plugin's or a
// loader's, so a check accepts exactly what the full validation accepts.
// `minify` minifies them with webpack's own minifier, so `webpack` must
// resolve to this repository (`yarn link && yarn link webpack`).

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { globSync } = require("glob");
const { precompile } = require("schema-utils");
const argv = require("./argv");

const { write: doWrite, root, schemas: schemasGlob } = argv;

/**
 * @param {string} path the file to compare against
 * @param {string} expected the content the file must hold
 * @returns {boolean} whether the file already holds it
 */
const updateFile = (path, expected) => {
	let normalizedContent = "";
	try {
		const content = fs.readFileSync(path, "utf8");
		normalizedContent = content.replace(/\r\n?/g, "\n");
	} catch (_err) {
		// ignore
	}
	if (normalizedContent.trim() === expected.trim()) return true;
	if (doWrite) {
		fs.writeFileSync(path, expected, "utf8");
		console.error(`${path} updated`);
		return true;
	}
	console.error(`${path} need to be updated\nExpected:\n${expected}`);
	return false;
};

/**
 * @param {string} schemaPath absolute path of the schema to precompile
 * @returns {Promise<boolean>} whether the check is up to date
 */
const precompileSchema = async (schemaPath) => {
	if (path.basename(schemaPath).startsWith("_")) return true;
	try {
		const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
		// A relative `$ref` to another schema resolves against this one
		schema.$id = pathToFileURL(schemaPath).href;
		const code = await precompile(schema, { minify: true });
		return updateFile(schemaPath.replace(/\.json$/, ".check.js"), code);
	} catch (err) {
		const error = /** @type {Error} */ (err);

		error.message += `\nduring precompilation of ${schemaPath}`;
		throw error;
	}
};

const main = async () => {
	const schemaPaths = globSync(schemasGlob, {
		cwd: root,
		absolute: true
	}).sort();
	const results = await Promise.all(schemaPaths.map(precompileSchema));
	process.exitCode = results.every(Boolean) ? 0 : 1;
};

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
