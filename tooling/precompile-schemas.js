/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

// Compile every `schemas/**/*.json` into the standalone validator webpack
// validates options with, as `schemas/**/*.check.js`.
//
//   node tooling/precompile-schemas.js          # report what is stale
//   node tooling/precompile-schemas.js --write  # write those validators
//
// WHY: webpack validates against generated code rather than carrying `ajv` at
// runtime, so the validators are committed and a check run names a stale one.

const fs = require("fs");
const path = require("path");
const { fileURLToPath, pathToFileURL } = require("url");
const { Name, _, default: Ajv } = require("ajv");
const standaloneCode = require("ajv/dist/standalone").default;
const findCommonDir = require("commondir");
const { globSync } = require("glob");
const terser = require("terser");
const argv = require("./argv");

const { write: doWrite, root, schemas: schemasGlob } = argv;

/**
 * A schema node holds arbitrary JSON, so its values have no narrower type.
 * @typedef {{ [key: string]: EXPECTED_ANY }} Schema
 */

const NESTED_WITH_NAME = ["definitions", "properties"];

const NESTED_DIRECT = ["items", "additionalProperties", "not"];

const NESTED_ARRAY = ["oneOf", "anyOf", "allOf"];

/**
 * @typedef {object} Visitor
 * @property {((json: Schema, context: EXPECTED_ANY) => Schema)=} schema visits every schema node
 * @property {((json: Schema, context: EXPECTED_ANY) => Schema)=} object visits every keyed group of schemas
 * @property {((json: Schema[], context: EXPECTED_ANY) => void)=} array visits every combinator array
 */

/**
 * Walks a schema depth-first, handing each node to the visitor.
 * @param {Visitor} visitor the visitor to apply
 * @param {Schema} json the schema node to process
 * @param {EXPECTED_ANY=} context carried through to every visitor call
 * @returns {Schema} the processed node
 */
const processSchema = (visitor, json, context) => {
	json = { ...json };
	if (visitor.schema) json = visitor.schema(json, context);

	for (const name of NESTED_WITH_NAME) {
		if (name in json && json[name] && typeof json[name] === "object") {
			if (visitor.object) json[name] = visitor.object(json[name], context);
			for (const key in json[name]) {
				json[name][key] = processSchema(visitor, json[name][key], context);
			}
		}
	}
	for (const name of NESTED_DIRECT) {
		if (name in json && json[name] && typeof json[name] === "object") {
			json[name] = processSchema(visitor, json[name], context);
		}
	}
	for (const name of NESTED_ARRAY) {
		if (name in json && Array.isArray(json[name])) {
			json[name] = [...json[name]];
			for (let i = 0; i < json[name].length; i++) {
				json[name][i] = processSchema(visitor, json[name][i], context);
			}
			if (visitor.array) visitor.array(json[name], context);
		}
	}

	return json;
};

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
	// Over the paths themselves a lone match is its own common directory, which
	// leaves every path below relative to nothing
	const commonDir = path.resolve(findCommonDir(absPaths.map(path.dirname)));
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

const ajv = new Ajv({
	code: { source: true, optimize: true },
	messages: false,
	strictNumbers: false,
	logger: false,
	/**
	 * @param {string} uri the `$ref` being resolved
	 * @returns {Promise<import("ajv").AnySchemaObject>} the referenced schema
	 */
	loadSchema: async (uri) => {
		const schemaPath = fileURLToPath(uri);

		const schema = require(schemaPath);

		const processedSchema = processJson(schema);
		processedSchema.$id = uri;
		return processedSchema;
	}
});

ajv.addKeyword({
	keyword: "instanceof",
	schemaType: "string",
	code(ctx) {
		const { data, schema } = ctx;
		ctx.fail(_`!(${data} instanceof ${new Name(schema)})`);
	}
});

ajv.addKeyword({
	keyword: "absolutePath",
	type: "string",
	schemaType: "boolean",

	code(ctx) {
		const { data, schema } = ctx;
		ctx.fail(
			_`${data}.includes("!") || (absolutePathRegExp.test(${data}) !== ${schema})`
		);
	}
});

ajv.removeKeyword("minLength");
ajv.addKeyword({
	keyword: "minLength",
	type: "string",
	schemaType: "number",

	code(ctx) {
		const { data } = ctx;
		ctx.fail(_`${data}.length < 1`);
	}
});

ajv.addKeyword({
	keyword: "undefinedAsNull",
	schemaType: "boolean",

	code(ctx) {
		// Nothing, just to avoid failing
	}
});
ajv.removeKeyword("enum");
ajv.addKeyword({
	keyword: "enum",
	schemaType: "array",
	$data: true,

	code(ctx) {
		const { data, schema, parentSchema } = ctx;
		ctx.fail(
			schema
				.map(
					/**
					 * @param {EXPECTED_ANY} x one allowed value
					 * @returns {import("ajv").Code} the check rejecting it
					 */
					(x) => {
						if (x === null && parentSchema.undefinedAsNull) {
							return _`${data} !== null && ${data} !== undefined`;
						}

						return _`${data} !== ${x}`;
					}
				)
				.reduce(
					/**
					 * @param {import("ajv").Code} a the checks so far
					 * @param {import("ajv").Code} b the next check
					 * @returns {import("ajv").Code} both checks joined
					 */
					(a, b) => _`${a} && ${b}`
				)
		);
	}
});

const EXCLUDED_PROPERTIES = [
	"title",
	"description",
	"deprecated",
	"experimental",
	"added",
	"cli",
	"implements",
	"tsType"
];

const processJson = processSchema.bind(null, {
	schema: (json) => {
		for (const p of EXCLUDED_PROPERTIES) {
			delete json[p];
		}
		return json;
	}
});

/**
 * @param {string} code the generated validator source
 * @returns {Promise<string>} the source with hoisted values and minified
 */
const postprocess = async (code) => {
	// Keep in sync with the `absolutePath` keyword of `schema-utils`, the
	// pre-compiled schema has to accept exactly what the real one accepts
	if (/absolutePathRegExp/.test(code)) {
		code = `const absolutePathRegExp = /^(?:file:(?=\\/))?(?:[A-Za-z]:[\\\\/]|\\\\\\\\|\\/)/i;${code}`;
	}

	// remove unnecessary error code:
	code = code
		.replace(/\{instancePath[^{}]+,keyword:[^{}]+,/g, "{")
		// remove extra "$id" property
		.replace(/"\$id":".+?"/, "");

	// minimize
	const minified = await terser.minify(code, {
		compress: {
			passes: 3
		},
		mangle: true,
		ecma: 2015,
		toplevel: true
	});

	code = /** @type {string} */ (minified.code);

	// banner
	// WHY: the declaration beside it used to shadow it, so the validator was never
	// type checked — minified code TypeScript would have plenty to say about.
	code = `// @ts-nocheck
/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run \`yarn fix:special\` to update
 */
${code}`;
	return code;
};

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
 * @param {SchemaFile} schemaFile the schema to precompile
 * @returns {Promise<boolean>} whether the validator is up to date
 */
const precompileSchema = async (schemaFile) => {
	const { absPath: schemaPath } = schemaFile;
	if (path.basename(schemaPath).startsWith("_")) return true;
	try {
		const processedSchema = processJson(schemaFile.parse());
		processedSchema.$id = pathToFileURL(schemaPath).href;
		const validate = await ajv.compileAsync(processedSchema);
		const code = await postprocess(standaloneCode(ajv, validate));
		const precompiledSchemaPath = schemaPath.replace(/\.json$/, ".check.js");
		return updateFile(precompiledSchemaPath, code);
	} catch (err) {
		const error = /** @type {Error} */ (err);

		error.message += `\nduring precompilation of ${schemaPath}`;
		throw error;
	}
};

/**
 * Compiles every schema into the standalone validator webpack validates with.
 * @param {SchemaFile[]} schemas every schema, already read
 * @returns {Promise<boolean>} whether every validator is up to date
 */
const precompileSchemas = async (schemas) => {
	// One `ajv` instance holds them all, and a `$ref` adds the schema it names,
	// so a schema must not be compiled after another compile has loaded it
	const results = await Promise.all(schemas.map(precompileSchema));
	return results.every(Boolean);
};

const main = async () => {
	process.exitCode = (await precompileSchemas(loadSchemas())) ? 0 : 1;
};

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
