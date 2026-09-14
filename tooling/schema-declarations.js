/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const fs = require("fs");
const path = require("path");
const { compile } = require("json-schema-to-typescript");
const prettier = require("prettier");
const argv = require("./argv");

const { verbose, root, declarations: outputFolder } = argv;

/**
 * Compiles every schema into the declaration file its options are read from.
 * These are build output rather than a tracked artifact, so they are written
 * whatever the mode: a checkout that has never generated them has none
 * @param {import("./schemas").SchemaFile[]} schemas every schema, already read
 * @returns {Promise<boolean>} whether every declaration could be written
 */
const makeDeclarations = async (schemas) => {
	const results = await Promise.all(schemas.map(makeDefinitionsForSchema));
	return results.every(Boolean);
};

/**
 * A schema node holds arbitrary JSON, so its values have no narrower type.
 * @typedef {{ [key: string]: EXPECTED_ANY }} Schema
 */

/**
 * @param {import("./schemas").SchemaFile} schemaFile the schema to compile
 * @returns {Promise<boolean>} whether the declaration is up to date
 */
const makeDefinitionsForSchema = async (schemaFile) => {
	const { relPath, basename } = schemaFile;
	if (path.basename(relPath).startsWith("_")) return true;
	const directory = path.dirname(relPath);
	const filename = path.resolve(
		root,
		outputFolder,
		`${path.join(directory, basename)}.d.ts`
	);
	const schema = schemaFile.parse();
	const keys = Object.keys(schema);
	if (keys.length === 1 && keys[0] === "$ref") return true;

	const prettierConfig = await prettier.resolveConfig(
		path.resolve(root, outputFolder, "result.d.ts")
	);
	if (!prettierConfig) {
		throw new Error("Prettier options not found");
	}

	const style = {
		printWidth: prettierConfig.printWidth,
		useTabs: prettierConfig.useTabs,
		tabWidth: prettierConfig.tabWidth
	};

	preprocessSchema(schema);
	return compile(schema, basename, {
		bannerComment:
			"/*\n * This file was automatically generated.\n * DO NOT MODIFY BY HAND.\n * Run `yarn fix:special` to update\n */",
		unreachableDefinitions: true,
		unknownAny: false,
		style
	}).then(
		(ts) => {
			ts = ts.replace(
				/\s+\*\s+\* This interface was referenced by `.+`'s JSON-Schema\s+\* via the `definition` ".+"\./g,
				""
			);
			let normalizedContent = "";
			try {
				const content = fs.readFileSync(filename, "utf8");
				normalizedContent = content.replace(/\r\n?/g, "\n");
			} catch (_err) {
				// ignore
			}
			if (normalizedContent.trim() === ts.trim()) return true;
			fs.mkdirSync(path.dirname(filename), { recursive: true });
			fs.writeFileSync(filename, ts, "utf8");
			if (verbose) {
				console.error(
					`declarations/${relPath.replace(/\\/g, "/")}.d.ts updated`
				);
			}
			return true;
		},
		(err) => {
			console.error(err);
			return false;
		}
	);
};

/**
 * @param {Schema} root the schema the reference is relative to
 * @param {string} ref a `#/`-prefixed JSON pointer
 * @returns {Schema} the referenced schema
 */
const resolvePath = (root, ref) => {
	const parts = ref.split("/");
	if (parts[0] !== "#") throw new Error("Unexpected ref");
	let current = root;
	for (const p of parts.slice(1)) {
		current = current[p];
	}
	return current;
};

/**
 * Folds the documentation-only keywords into descriptions and splits the shapes
 * `json-schema-to-typescript` cannot express into named definitions.
 * @param {Schema} schema the schema node to process
 * @param {Schema=} root the schema the node belongs to
 * @param {string[]=} path the property names walked to reach the node
 * @returns {void}
 */
const preprocessSchema = (schema, root = schema, path = []) => {
	if (schema.added) {
		const added =
			typeof schema.added === "string" ? `@since ${schema.added}` : "@since";
		schema.description = schema.description
			? `${schema.description}\n${added}`
			: added;
		delete schema.added;
	}
	if (schema.experimental) {
		const experimental =
			typeof schema.experimental === "string"
				? `@experimental ${schema.experimental}`
				: "@experimental";
		schema.description = schema.description
			? `${schema.description}\n${experimental}`
			: experimental;
		delete schema.experimental;
	}
	if ("definitions" in schema) {
		for (const key of Object.keys(schema.definitions)) {
			preprocessSchema(schema.definitions[key], root, [key]);
		}
	}
	if ("properties" in schema) {
		for (const key of Object.keys(schema.properties)) {
			const property = schema.properties[key];
			if ("$ref" in property) {
				const result = resolvePath(root, property.$ref);
				if (!result) {
					throw new Error(
						`Unable to resolve "$ref": "${property.$ref}" in ${path.join("/")}`
					);
				}
				schema.properties[key] = {
					description: result.description,
					deprecated: result.deprecated,
					experimental: result.experimental,
					added: result.added,
					anyOf: [property]
				};
			} else if (
				"oneOf" in property &&
				property.oneOf.length === 1 &&
				"$ref" in property.oneOf[0]
			) {
				const result = resolvePath(root, property.oneOf[0].$ref);
				schema.properties[key] = {
					description: property.description || result.description,
					deprecated: property.deprecated || result.deprecated,
					experimental: property.experimental || result.experimental,
					added: property.added || result.added,
					anyOf: property.oneOf
				};
				preprocessSchema(schema.properties[key], root, [...path, key]);
			} else {
				preprocessSchema(property, root, [...path, key]);
			}
		}
	}
	if ("items" in schema) {
		preprocessSchema(schema.items, root, [...path, "item"]);
	}
	if (typeof schema.additionalProperties === "object") {
		preprocessSchema(schema.additionalProperties, root, [...path, "property"]);
	}
	const arrayProperties = ["oneOf", "anyOf", "allOf"];
	for (const prop of arrayProperties) {
		if (Array.isArray(schema[prop])) {
			let i = 0;
			for (const item of schema[prop]) {
				preprocessSchema(item, root, [...path, item.type || i++]);
			}
		}
	}
	if ("type" in schema && schema.type === "array") {
		// Workaround for a typescript bug that
		// string[] is not assignable to [string, ...string]
		delete schema.minItems;
	}
	if ("implements" in schema) {
		const implementedProps = new Set();
		const implementedNames = [];
		for (const impl of [schema.implements].flat()) {
			const referencedSchema = resolvePath(root, impl);
			for (const prop of Object.keys(referencedSchema.properties)) {
				implementedProps.add(prop);
			}
			implementedNames.push(
				/** @type {RegExpExecArray} */ (/\/([^/]+)$/.exec(impl))[1]
			);
		}
		const propEntries = Object.entries(schema.properties).filter(
			([name]) => !implementedProps.has(name)
		);
		if (propEntries.length > 0) {
			const key = `${path.map((x) => x[0].toUpperCase() + x.slice(1)).join("")}Extra`;
			implementedNames.push(key);
			// `implements` is a reserved word under strict mode, so it is dropped
			// from the copy rather than destructured out of it
			const remainingSchema = { ...schema };
			delete remainingSchema.implements;
			root.definitions[key] = {
				...remainingSchema,
				properties: Object.fromEntries(propEntries)
			};
			preprocessSchema(root.definitions[key], root, [key]);
		}
		schema.tsType = implementedNames.join(" & ");
		return;
	}
	if (
		"properties" in schema &&
		typeof schema.additionalProperties === "object" &&
		!schema.tsType
	) {
		const { properties, additionalProperties, ...remaining } = schema;
		const key1 = `${path.map((x) => x[0].toUpperCase() + x.slice(1)).join("")}Known`;
		const key2 = `${path.map((x) => x[0].toUpperCase() + x.slice(1)).join("")}Unknown`;
		root.definitions[key1] = {
			...remaining,
			properties,
			additionalProperties: false
		};
		preprocessSchema(root.definitions[key1], root, [key1]);
		root.definitions[key2] = {
			...remaining,
			additionalProperties
		};
		preprocessSchema(root.definitions[key2], root, [key2]);
		schema.tsType = `${key1} & ${key2}`;
	}
};

module.exports = makeDeclarations;
