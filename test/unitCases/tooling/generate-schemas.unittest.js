"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

describe("generate-schemas", () => {
	/** @type {string} */
	let directory;

	beforeEach(() => {
		const output = path.resolve(__dirname, "../../js");
		fs.mkdirSync(output, { recursive: true });
		directory = fs.mkdtempSync(path.join(output, "generate-schemas-"));
		for (const name of ["tooling", "lib", "declarations", "schemas"]) {
			fs.mkdirSync(path.join(directory, name));
		}
		fs.copyFileSync(
			path.resolve(__dirname, "../../../tooling/generate-schemas.js"),
			path.join(directory, "tooling/generate-schemas.js")
		);
	});

	afterEach(() => {
		fs.rmSync(directory, { recursive: true, force: true });
	});

	it("writes changed declarations and then validates the generated schema", () => {
		const schema = path.join(directory, "schemas/Options.json");
		fs.writeFileSync(schema, "{}\n");
		fs.writeFileSync(
			path.join(directory, "declarations/Options.ts"),
			"/** @schema */\nexport interface Options { enabled?: boolean; }\n"
		);
		/**
		 * @param {string[]} arguments_ command line arguments
		 * @returns {import("child_process").SpawnSyncReturns<string>} generator result
		 */
		const run = (...arguments_) =>
			spawnSync(
				process.execPath,
				[path.join(directory, "tooling/generate-schemas.js"), ...arguments_],
				{ cwd: directory, encoding: "utf8" }
			);

		const stale = run();
		expect(stale.stderr).toBe("");
		expect(stale.status).toBe(1);
		expect(stale.stdout).toContain("Options.json:");
		expect(fs.readFileSync(schema, "utf8")).toBe("{}\n");

		const written = run("--write");
		expect(written.stderr).toBe("");
		expect(written.status).toBe(0);
		expect(JSON.parse(fs.readFileSync(schema, "utf8"))).toMatchObject({
			title: "Options",
			type: "object",
			properties: { enabled: { type: "boolean" } }
		});
		expect(run().status).toBe(0);

		const generated = fs.readFileSync(schema, "utf8");
		expect(run("--write").status).toBe(0);
		expect(fs.readFileSync(schema, "utf8")).toBe(generated);
	});
});
