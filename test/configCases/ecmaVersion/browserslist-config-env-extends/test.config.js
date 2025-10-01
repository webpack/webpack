"use strict";

const fs = require("fs");
const path = require("path");

const rootPath = path.resolve(__dirname, "../../../../");
const rootNodeModules = path.resolve(rootPath, "./node_modules");
const browserslistPackage = path.resolve(
	rootNodeModules,
	"browserslist-config-mycompany"
);
const content = `
module.exports = {
  development: [
    'last 1 version'
  ],
  production: [
    'ie 9',
  ]
}
`;
const browserslistFile = path.resolve(browserslistPackage, "./index.js");

try {
	fs.mkdirSync(browserslistPackage);
} catch (_err) {
	// Nothing
}

fs.writeFileSync(browserslistFile, content);

module.exports = {
	afterExecute() {
		fs.unlinkSync(browserslistFile);
		fs.rmdirSync(browserslistPackage);
	}
};
