const fs = require("fs");
const path = require("path");
const prettierrc = require("../.prettierrc.js"); // eslint-disable-line
const { compile } = require("json-schema-to-typescript");

const schemasDir = path.resolve(__dirname, "../schemas");
const style = {
	printWidth: prettierrc.printWidth,
	useTabs: prettierrc.useTabs,
	tabWidth: prettierrc.tabWidth
};

// When --write is set, files will be written in place
// Otherwise it only prints outdated files
const doWrite = process.argv.includes("--write");

const makeSchemas = () => {
	// include the top level folder "./schemas" by default
	const dirs = new Set([schemasDir]);

	// search for all nestedDirs inside of this folder
	for (let dirWithSchemas of dirs) {
		for (let item of fs.readdirSync(dirWithSchemas)) {
			const absPath = path.resolve(dirWithSchemas, item);
			if (fs.statSync(absPath).isDirectory()) {
				dirs.add(absPath);
			} else if (item.endsWith(".json")) {
				makeDefinitionsForSchema(absPath);
			}
		}
	}
};

const makeDefinitionsForSchema = absSchemaPath => {
	const relPath = path
		.relative(schemasDir, absSchemaPath)
		.replace(/\.json$/i, "");
	const basename = path.basename(relPath);
	const filename = path.resolve(__dirname, `../declarations/${relPath}.d.ts`);
	const schema = JSON.parse(fs.readFileSync(absSchemaPath, "utf-8"));
	preprocessSchema(schema);
	compile(schema, basename, {
		bannerComment:
			"/**\n * This file was automatically generated.\n * DO NOT MODIFY BY HAND.\n * Run `yarn special-lint-fix` to update\n */",
		unreachableDefinitions: true,
		style
	}).then(
		ts => {
			ts = ts.replace(
				/\s+\*\s+\* This interface was referenced by `.+`'s JSON-Schema\s+\* via the `definition` ".+"\./g,
				""
			);
			let normalizedContent = "";
			try {
				const content = fs.readFileSync(filename, "utf-8");
				normalizedContent = content.replace(/\r\n?/g, "\n");
			} catch (e) {
				// ignore
			}
			if (normalizedContent.trim() !== ts.trim()) {
				if (doWrite) {
					fs.mkdirSync(path.dirname(filename), { recursive: true });
					fs.writeFileSync(filename, ts, "utf-8");
					console.error(
						`declarations/${relPath.replace(/\\/g, "/")}.d.ts updated`
					);
				} else {
					console.error(
						`declarations/${relPath.replace(
							/\\/g,
							"/"
						)}.d.ts need to be updated`
					);
					process.exitCode = 1;
				}
			}
		},
		err => {
			console.error(err);
			process.exitCode = 1;
		}
	);
};

const resolvePath = (root, ref) => {
	const parts = ref.split("/");
	if (parts[0] !== "#") throw new Error("Unexpected ref");
	let current = root;
	for (const p of parts.slice(1)) {
		current = current[p];
	}
	return current;
};

const preprocessSchema = (schema, root = schema) => {
	if ("definitions" in schema) {
		for (const key of Object.keys(schema.definitions)) {
			preprocessSchema(schema.definitions[key], root);
		}
	}
	if ("properties" in schema) {
		for (const key of Object.keys(schema.properties)) {
			const property = schema.properties[key];
			if ("$ref" in property) {
				const result = resolvePath(root, property.$ref);
				schema.properties[key] = {
					description: result.description,
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
					anyOf: property.oneOf
				};
				preprocessSchema(schema.properties[key], root);
			} else {
				preprocessSchema(property, root);
			}
		}
	}
	if ("items" in schema) {
		preprocessSchema(schema.items, root);
	}
	if (typeof schema.additionalProperties === "object") {
		preprocessSchema(schema.additionalProperties, root);
	}
	const arrayProperties = ["oneOf", "anyOf", "allOf"];
	for (const prop of arrayProperties) {
		if (Array.isArray(schema[prop])) {
			for (const item of schema[prop]) {
				preprocessSchema(item, root);
			}
		}
	}
};

makeSchemas();
