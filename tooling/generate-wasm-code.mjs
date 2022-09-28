import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

// eslint-disable-next-line node/no-missing-import
import asc from "assemblyscript/asc";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// When --write is set, files will be written in place
// Otherwise it only prints outdated files
const doWrite = process.argv.includes("--write");

const files = ["lib/util/hash/xxhash64.js", "lib/util/hash/md4.js"];

(async () => {
	for (const file of files) {
		const filePath = path.resolve(__dirname, "..", file);
		const content = fs.readFileSync(filePath, "utf-8");

		const regexp =
			/\n\/\/#region wasm code: (.+) \((.+)\)(.*)\n[\s\S]+?\/\/#endregion\n/g;

		const replaces = new Map();

		let match = regexp.exec(content);
		while (match) {
			const [fullMatch, identifier, name, flags] = match;

			const sourcePath = path.resolve(filePath, "..", name);
			const sourcePathBase = path.join(
				path.dirname(sourcePath),
				path.basename(sourcePath)
			);

			await asc.main([
				sourcePath,
				// cspell:word Ospeed
				"-O3",
				"--noAssert",
				"--converge",
				"--textFile",
				sourcePathBase + ".wat",
				"--outFile",
				sourcePathBase + ".wasm",
				...flags.split(" ").filter(Boolean)
			]);

			const wasm = fs.readFileSync(sourcePathBase + ".wasm");

			replaces.set(
				fullMatch,
				`
//#region wasm code: ${identifier} (${name})${flags}
const ${identifier} = new WebAssembly.Module(
	Buffer.from(
		// ${wasm.length} bytes
		${JSON.stringify(wasm.toString("base64"))},
		"base64"
	)
);
//#endregion
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
