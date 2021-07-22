const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const dir = path.resolve(__dirname, "temp");
const file = path.resolve(dir, "index.js");

fs.mkdirSync(dir, {
	recursive: true
});
fs.writeFileSync(
	file,
	`import v1 from ${JSON.stringify(
		pathToFileURL(
			path.resolve(
				"./test/configCases/asset-modules/file-url/src with spaces/module.js"
			)
		)
	)};
import v2 from ${JSON.stringify(
		"file://localhost" +
			pathToFileURL(
				path.resolve(
					"./test/configCases/asset-modules/file-url/src with spaces/module.js"
				)
			)
				.toString()
				.slice("file://".length)
	)};
export const val1 = v1;
export const val2 = v2;`
);
fs.utimesSync(file, new Date(Date.now() - 10000), new Date(Date.now() - 10000));

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development"
};
