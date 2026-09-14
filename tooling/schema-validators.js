/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const fs = require("fs");
const path = require("path");
const { fileURLToPath, pathToFileURL } = require("url");
const { Name, _, default: Ajv } = require("ajv");
const standaloneCode = require("ajv/dist/standalone").default;
const terser = require("terser");
const argv = require("./argv");
const processSchema = require("./process-schema");

const { write: doWrite, root, declarations } = argv;

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
	code = `/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run \`yarn fix:special\` to update
 */
${code}`;
	return code;
};

/**
 * @param {string} schemaPath absolute path of the schema
 * @param {string} title the schema's title
 * @param {string} relPath the schema's path relative to the schemas directory
 * @returns {string} the declaration file's content
 */
const createDeclaration = (schemaPath, title, relPath) => {
	const directory = path.dirname(relPath);
	const basename = path.basename(relPath, path.extname(relPath));
	const filename = path.resolve(
		root,
		declarations,
		`${path.join(directory, basename)}`
	);
	const fromSchemaToDeclaration = path
		.relative(path.dirname(schemaPath), filename)
		.replace(/\\/g, "/");
	return `/*
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run \`yarn fix:special\` to update
 */
declare const check: (options: ${
		title
			? `import(${JSON.stringify(fromSchemaToDeclaration)}).${title}`
			: "any"
	}) => boolean;
export = check;
`;
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
 * @param {import("./schemas").SchemaFile} schemaFile the schema to precompile
 * @returns {Promise<boolean>} whether the validator is up to date
 */
const precompileSchema = async (schemaFile) => {
	const { absPath: schemaPath, relPath } = schemaFile;
	if (path.basename(schemaPath).startsWith("_")) return true;
	try {
		const schema = schemaFile.parse();

		const title = schema.title;
		const processedSchema = processJson(schema);
		processedSchema.$id = pathToFileURL(schemaPath).href;
		const validate = await ajv.compileAsync(processedSchema);
		const code = await postprocess(standaloneCode(ajv, validate));
		const precompiledSchemaPath = schemaPath.replace(/\.json$/, ".check.js");
		const precompiledSchemaDeclarationPath = schemaPath.replace(
			/\.json$/,
			".check.d.ts"
		);
		const codeIsCurrent = updateFile(precompiledSchemaPath, code);
		const declarationIsCurrent = updateFile(
			precompiledSchemaDeclarationPath,
			createDeclaration(schemaPath, title, relPath)
		);
		return codeIsCurrent && declarationIsCurrent;
	} catch (err) {
		const error = /** @type {Error} */ (err);

		error.message += `\nduring precompilation of ${schemaPath}`;
		throw error;
	}
};

/**
 * Compiles every schema into the standalone validator webpack validates with.
 * @param {import("./schemas").SchemaFile[]} schemas every schema, already read
 * @returns {Promise<boolean>} whether every validator is up to date
 */
const precompileSchemas = async (schemas) => {
	// One `ajv` instance holds them all, and a `$ref` adds the schema it names,
	// so a schema must not be compiled after another compile has loaded it
	const results = await Promise.all(schemas.map(precompileSchema));
	return results.every(Boolean);
};

module.exports = precompileSchemas;
