const fs = require("fs");
const path = require("path");
const mkdirp = require("mkdirp");
const prettierrc = require("../.prettierrc.js"); // eslint-disable-line
const { compileFromFile } = require("json-schema-to-typescript");

const schemasDir = path.resolve(__dirname, "../schemas");
const style = {
	printWidth: prettierrc.printWidth,
	useTabs: prettierrc.useTabs,
	tabWidth: prettierrc.tabWidth
};

// When --write is set, files will be written in place
// Elsewise it only prints outdated files
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
	const basename = path
		.relative(schemasDir, absSchemaPath)
		.replace(/\.json$/i, "");
	const filename = path.resolve(__dirname, `../declarations/${basename}.d.ts`);
	compileFromFile(absSchemaPath, {
		bannerComment:
			"/**\n * This file was automatically generated.\n * DO NOT MODIFY BY HAND.\n * Run `yarn special-lint-fix` to update\n */",
		unreachableDefinitions: true,
		style
	}).then(
		ts => {
			let normalizedContent = "";
			try {
				const content = fs.readFileSync(filename, "utf-8");
				normalizedContent = content.replace(/\r\n?/g, "\n");
			} catch (e) {
				// ignore
			}
			if (normalizedContent.trim() !== ts.trim()) {
				if (doWrite) {
					mkdirp.sync(path.dirname(filename));
					fs.writeFileSync(filename, ts, "utf-8");
					console.error(
						`declarations/${basename.replace(/\\/g, "/")}.d.ts updated`
					);
				} else {
					console.error(
						`declarations/${basename.replace(
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

makeSchemas();
