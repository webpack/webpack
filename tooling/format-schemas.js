const fs = require("fs");
const path = require("path");
const prettier = require("prettier");

const schemasDir = path.resolve(__dirname, "../schemas");

// When --write is set, files will be written in place
// Elsewise it only prints outdated files
const doWrite = process.argv.includes("--write");

const sortObjectAlphabetically = obj => {
	const keys = Object.keys(obj).sort();
	const newObj = {};
	for (const key of keys) {
		newObj[key] = obj[key];
	}
	return newObj;
};

const sortObjectWithList = (obj, props) => {
	const keys = Object.keys(obj)
		.filter(p => !props.includes(p))
		.sort();
	const newObj = {};
	for (const key of props) {
		if (key in obj) {
			newObj[key] = obj[key];
		}
	}
	for (const key of keys) {
		newObj[key] = obj[key];
	}
	return newObj;
};

const PROPERTIES = [
	"$ref",
	"definitions",

	"$id",
	"id",
	"title",
	"description",
	"type",

	"items",
	"minItems",
	"uniqueItems",

	"additionalProperties",
	"properties",
	"required",
	"minProperties",

	"oneOf",
	"anyOf",
	"allOf",
	"enum",

	"absolutePath",
	"minLength",

	"minimum",

	"instanceof",

	"tsType"
];

const NESTED_WITH_NAME = ["definitions", "properties"];

const NESTED_DIRECT = ["items", "additionalProperties"];

const NESTED_ARRAY = ["oneOf", "anyOf", "allOf"];

const processJson = json => {
	json = sortObjectWithList(json, PROPERTIES);

	for (const name of NESTED_WITH_NAME) {
		if (name in json && json[name] && typeof json[name] === "object") {
			json[name] = sortObjectAlphabetically(json[name]);
			for (const key in json[name]) {
				json[name][key] = processJson(json[name][key]);
			}
		}
	}
	for (const name of NESTED_DIRECT) {
		if (name in json && json[name] && typeof json[name] === "object") {
			json[name] = processJson(json[name]);
		}
	}
	for (const name of NESTED_ARRAY) {
		if (name in json && Array.isArray(json[name])) {
			for (let i = 0; i < json[name].length; i++) {
				json[name][i] = processJson(json[name][i]);
			}
		}
	}

	return json;
};

const formatSchema = schemaPath => {
	const json = require(schemaPath);
	const processedJson = processJson(json);
	const rawString = JSON.stringify(processedJson, null, 2);
	prettier.resolveConfig(schemaPath).then(config => {
		config.filepath = schemaPath;
		config.parser = "json";
		const prettyString = prettier.format(rawString, config);
		let normalizedContent = "";
		try {
			const content = fs.readFileSync(schemaPath, "utf-8");
			normalizedContent = content.replace(/\r\n?/g, "\n");
		} catch (e) {
			// ignore
		}
		if (normalizedContent.trim() !== prettyString.trim()) {
			const basename = path.relative(schemasDir, schemaPath);
			if (doWrite) {
				fs.writeFileSync(schemaPath, prettyString, "utf-8");
				console.error(`schemas/${basename.replace(/\\/g, "/")} updated`);
			} else {
				console.error(
					`schemas/${basename.replace(/\\/g, "/")} need to be updated`
				);
				process.exitCode = 1;
			}
		}
	});
};

// include the top level folder "./schemas" by default
const dirs = new Set([schemasDir]);

// search for all nestedDirs inside of this folder
for (let dirWithSchemas of dirs) {
	for (let item of fs.readdirSync(dirWithSchemas)) {
		const absPath = path.resolve(dirWithSchemas, item);
		if (fs.statSync(absPath).isDirectory()) {
			dirs.add(absPath);
		} else if (item.endsWith(".json")) {
			formatSchema(absPath);
		}
	}
}
