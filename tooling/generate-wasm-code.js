const path = require("path");
const fs = require("fs");

// When --write is set, files will be written in place
// Otherwise it only prints outdated files
const doWrite = process.argv.includes("--write");

const files = ["lib/util/hash/xxhash64.js", "lib/util/hash/md4.js"];

(async () => {
	// TODO: fix me after update typescript to v5
	// eslint-disable-next-line no-warning-comments
	// @ts-ignore
	// eslint-disable-next-line n/no-unsupported-features/es-syntax
	const asc = (await import("assemblyscript/asc")).default;

	for (const file of files) {
		const filePath = path.resolve(__dirname, "..", file);
		const content = fs.readFileSync(filePath, "utf-8");

		const regexp =
			/\n\/\/[\s]*#region wasm code: (.+) \((.+)\)(.*)\n[\s\S]+?\/\/[\s+]*#endregion\n/g;

		const replaces = new Map();

		let match = regexp.exec(content);
		while (match) {
			const [fullMatch, identifier, name, flags] = match;

			const sourcePath = path.resolve(filePath, "..", name);
			const sourcePathBase = path.join(
				path.dirname(sourcePath),
				path.basename(sourcePath)
			);

			const { error } = await asc.main(
				[
					sourcePath,
					// cspell:word Ospeed
					"-Ospeed",
					"--noAssert",
					"--converge",
					"--textFile",
					`${sourcePathBase}.wat`,
					"--outFile",
					`${sourcePathBase}.wasm`,
					...flags.split(" ").filter(Boolean)
				],
				{
					stdout: process.stdout,
					stderr: process.stderr
				}
			);

			if (error) {
				throw error;
			}

			const wasm = fs.readFileSync(`${sourcePathBase}.wasm`);

			replaces.set(
				fullMatch,
				`
// #region wasm code: ${identifier} (${name})${flags}
const ${identifier} = new WebAssembly.Module(
	Buffer.from(
		// ${wasm.length} bytes
		${JSON.stringify(wasm.toString("base64"))},
		"base64"
	)
);
// #endregion
`
			);
			match = regexp.exec(content);
		}

		const newContent = content.replace(regexp, match => replaces.get(match));

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
