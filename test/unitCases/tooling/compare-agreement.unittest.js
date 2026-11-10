"use strict";

// No reference parser is installed here, as in a checkout that never ran the
// setup: the sweep has to skip the relation and name the reference as missing.
jest.mock("../../../tooling/compare-tools-harness", () => ({
	...jest.requireActual("../../../tooling/compare-tools-harness"),
	loaderFor: () => (/** @type {string} */ name) => {
		throw new Error(`Cannot find module '${name}'`);
	}
}));

/**
 * Runs one script's sweep, narrowed to the agreement relation and one fixture.
 * `RELATION` and `FIXTURE` are read as a script loads, so each loads afresh.
 * @param {string} script the comparison script, under `tooling/`
 * @param {string} fixture the fixture to narrow the sweep to
 * @returns {Promise<{ out: string, exitCode: typeof process.exitCode }>} what it reported
 */
const sweep = async (script, fixture) => {
	const previous = {
		RELATION: process.env.RELATION,
		FIXTURE: process.env.FIXTURE
	};
	// WHY: Bun's sandboxed `process.exitCode` accessor drops every write, so a
	// plain property stands in for it while the sweep runs.
	const exitCodeDescriptor = /** @type {PropertyDescriptor} */ (
		Object.getOwnPropertyDescriptor(process, "exitCode")
	);
	Object.defineProperty(process, "exitCode", {
		value: undefined,
		writable: true,
		configurable: true
	});
	process.env.RELATION = "agreement";
	process.env.FIXTURE = fixture;
	/** @type {string[]} */
	const written = [];
	const stdout = jest
		.spyOn(process.stdout, "write")
		.mockImplementation((chunk) => {
			written.push(String(chunk));
			return true;
		});
	const stderr = jest
		.spyOn(process.stderr, "write")
		.mockImplementation(() => true);
	try {
		/** @type {(mode?: string) => Promise<unknown>} */
		let runMode = () => Promise.resolve();
		jest.isolateModules(() => {
			({ runMode } = require(`../../../tooling/${script}`));
		});
		await runMode("--invariants");
		return { out: written.join(""), exitCode: process.exitCode };
	} finally {
		stdout.mockRestore();
		stderr.mockRestore();
		for (const key of /** @type {const} */ (["RELATION", "FIXTURE"])) {
			if (previous[key] === undefined) delete process.env[key];
			else process.env[key] = previous[key];
		}
		Object.defineProperty(process, "exitCode", exitCodeDescriptor);
	}
};

describe("the agreement invariant without its reference installed", () => {
	it.each([
		["compare-css-tools.js", "cold branches", ["css-tree"]],
		// The printer reads with scripting on, so HTML is held to both readings.
		["compare-html-tools.js", "Tag soup", ["parse5", "parse5 (scripting)"]],
		["compare-xml-tools.js", "Maven POM", ["@rgrove/parse-xml"]]
	])(
		"%s names %s's reference as missing and reports no finding",
		async (script, fixture, references) => {
			const { out, exitCode } = await sweep(script, fixture);
			expect(out).toContain(
				`not built — ${references.length}\n${references
					.map(
						(reference) =>
							`    ${reference}, the agreement relation's reference\n`
					)
					.join("")}`
			);
			expect(out).toContain("\n0 findings\n");
			// Without `--require-corpus` a sweep missing its corpus still passes.
			expect(exitCode).toBe(0);
		}
	);
});
