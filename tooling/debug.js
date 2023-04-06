var fs = require("fs");
var path = require("path");

let content = fs.readFileSync(
	path.resolve(
		process.cwd(),
		"node_modules/tooling/precompile-schemas/index.js"
	),
	"utf-8"
);

content = content.replace(
	// eslint-disable-next-line no-template-curly-in-string
	"console.error(`${path} need to be updated`);",
	// eslint-disable-next-line no-template-curly-in-string
	"console.error(`${path} need to be updated`);\nconsole.log(expected);"
);

fs.writeFileSync(
	path.resolve(
		process.cwd(),
		"node_modules/tooling/precompile-schemas/index.js"
	),
	content
);
