const fs = require("fs");
const path = require("path");
const style = require("../.prettierrc.js"); // eslint-disable-line
const { compileFromFile } = require("json-schema-to-typescript");
const schemasDir = path.resolve(__dirname, "../schemas");

const makeSchemas = () => {
	// include the top level folder "./schemas" by default
	const dirs = [schemasDir];

	// search for all nestedDirs inside of this folder
	// TODO: Although I don't think it makes sense at all to ever have nested folders here, (just one level deep)
	// this should technically have recursive handling for those nested folers
	for (let dir of fs.readdirSync(schemasDir)) {
		const absDirPath = path.resolve(schemasDir, dir);
		console.log(dir, schemasDir);
		if (fs.statSync(absDirPath).isDirectory()) {
			dirs.push(absDirPath);
		}
	}

	for (let dirWithSchemas of dirs) {
		processSchemasInDir(dirWithSchemas);
	}
};

const processSchemasInDir = absDirPath => {
	const schemas = fs
		.readdirSync(absDirPath)
		.filter(name => name.endsWith(".json"))
		.map(name => ({
			fileName: name.split(".")[0],
			name: path.resolve(absDirPath, name)
		}));
	for (let { fileName, name } of schemas) {
		makeDefinitionsForSchema(fileName, path.resolve(absDirPath, name));
	}
};

const makeDefinitionsForSchema = (fileName, absSchemaPath) => {
	compileFromFile(absSchemaPath, { style }).then(ts => {
		fs.writeFileSync(
			path.resolve(__dirname, `../declarations/${fileName}.d.ts`),
			ts
		);
	});
};

makeSchemas();
