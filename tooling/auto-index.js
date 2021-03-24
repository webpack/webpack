const { existsSync } = require("fs");
const { readdirSync, writeFileSync } = require("fs");
const { resolve, parse, join } = require("path");
const { format, resolveConfig } = require("prettier");

generateAll().catch(e => {
	process.exitCode = 1;
	console.log(e);
});

async function generateAll() {
	await writeAutoIndex("./lib/dependencies");
	await writeAutoIndex("./lib/asset");
	await writeAutoIndex("./lib/async-modules");
	await writeAutoIndex("./lib/container", [
		{ file: "options.js", exports: ["scope"] }
	]);
}

async function writeAutoIndex(dir, explicitExports = []) {
	console.log(`Generating index for ${dir}`);
	const dirContent = readdirSync(dir, { withFileTypes: true });

	const ignore = new Set(["index.js"]);
	let indexCode = `/*\n\tMIT License http://www.opensource.org/licenses/mit-license.php\n\tAuthor Auto Index Generator\n*/\n`;
	indexCode += `\n"use strict";\n`;
	indexCode += `\n/*
	* This file was automatically generated.
	* DO NOT MODIFY BY HAND.
	* Run \`yarn auto-index\` to update
	*/\n`;
	indexCode += `\nmodule.exports = {`;

	const duplicates = new Map();
	const entities = [];

	for (const entry of dirContent) {
		if (entry.isFile() && !ignore.has(entry.name)) {
			entities.push(entry.name);
		}
	}

	for (const entryName of entities.sort()) {
		const fullPath = resolve(dir, entryName);
		const name = parse(entryName).name;
		checkDuplicates(name, fullPath);
		indexCode += `\nget ${name}(){return require("./${name}")},`;
	}

	for (const { file, exports } of explicitExports) {
		const fullPath = resolve(dir, file);
		const name = parse(fullPath).name;
		if (existsSync(fullPath)) {
			for (const exportName of exports) {
				checkDuplicates(exportName, fullPath);
				indexCode += `\nget ${exportName}(){return require("./${name}").${exportName}},`;
			}
		} else {
			throw new Error(`explicit export file does not exist ${fullPath}`);
		}
	}

	indexCode += "\n}";
	const indexOutputPath = join(dir, "index.js");
	writeFileSync(
		indexOutputPath,
		format(indexCode, {
			parser: "babel",
			...(await resolveConfig(indexOutputPath))
		})
	);

	function checkDuplicates(name, fullPath) {
		if (duplicates.has(name)) {
			const paths = duplicates.get(name);
			paths.add(fullPath);
			throw new Error(
				`Duplicate exports are not allowed duplicates are presents in ${Array.from(
					paths
				)} `
			);
		} else {
			duplicates.set(name, new Set([fullPath]));
		}
	}
}
