import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

it("should preserve import attributes on external star reexports", () => {
	const url = pathToFileURL(resolve(__dirname, `library${__STATS_I__}.mjs`));
	const output = execFileSync(process.execPath, [
		...(process.versions.deno ? ["eval"] : ["--input-type=module", "-e"]),
		`import * as library from ${JSON.stringify(url.href)}; console.log(JSON.stringify(library));`
	]);
	expect(JSON.parse(output.toString())).toEqual({ data: { answer: 42 }, value: 1 });
});
