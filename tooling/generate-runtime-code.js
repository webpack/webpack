const path = require("path");
const fs = require("fs");
const terser = require("terser");
const prettier = require("prettier");

// When --write is set, files will be written in place
// Otherwise it only prints outdated files
const doWrite = process.argv.includes("--write");

const files = ["lib/util/semver.js"];

(async () => {
	for (const file of files) {
		const filePath = path.resolve(__dirname, "..", file);
		const content = fs.readFileSync(filePath, "utf-8");
		const exports = require(`../${file}`);

		const regexp = /\n\/\/#region runtime code: (.+)\n[\s\S]+?\/\/#endregion\n/g;

		const replaces = new Map();

		let match = regexp.exec(content);
		while (match) {
			const [fullMatch, name] = match;
			const originalCode = exports[name].toString();
			const header = /^\(?([^=)]+)\)?\s=> \{/.exec(originalCode);
			const body = originalCode.slice(header[0].length, -1);
			const result = await terser.minify(
				{
					["input.js"]: body
				},
				{
					compress: true,
					mangle: true,
					ecma: 5,
					toplevel: true,
					parse: {
						bare_returns: true
					}
				}
			);

			const args = header[1];
			if (/`|const|let|=>|\.\.\./.test(result.code)) {
				throw new Error(`Code Style of ${name} in ${file} is too high`);
			}
			let templateLiteral = false;
			const code = result.code
				.replace(/\\/g, "\\\\")
				.replace(/'/g, "\\'")
				.replace(/function\(([^)]+)\)/g, (m, args) => {
					templateLiteral = true;
					return `\${runtimeTemplate.supportsArrowFunction() ? '${
						args.includes(",") ? `(${args})` : args
					}=>' : 'function(${args})'}`;
				});
			replaces.set(
				fullMatch,
				`
//#region runtime code: ${name}
exports.${name}RuntimeCode = runtimeTemplate => \`var ${name} = \${runtimeTemplate.basicFunction("${args}", [
	"// see webpack/${file} for original code",
	${templateLiteral ? `\`${code}\`` : `'${code}'`}
])}\`;
//#endregion
`
			);
			match = regexp.exec(content);
		}

		const prettierConfig = prettier.resolveConfig.sync(filePath);
		const newContent = prettier.format(
			content.replace(regexp, match => replaces.get(match)),
			{ filepath: filePath, ...prettierConfig }
		);

		if (newContent !== content) {
			if (doWrite) {
				fs.writeFileSync(filePath, newContent, "utf-8");
				console.error(`${file} updated`);
			} else {
				console.error(`${file} need to be updated`);
				process.exitCode = 1;
			}
		}
	}
})();
