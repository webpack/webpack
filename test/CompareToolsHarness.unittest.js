"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const {
	filterFrom,
	formatCost,
	measureInWorker
} = require("../tooling/compare-tools-harness");

/** @type {string} */
let directory;

let made = 0;

/**
 * A stand-in worker: it drains the source it is handed as the real one does,
 * then writes what the test asks for instead of a measurement.
 * @param {string} output what it writes to stdout
 * @param {number=} code what it exits with
 * @returns {string} the script's path
 */
const workerWriting = (output, code) => {
	const file = path.join(directory, `worker${made++}.js`);
	fs.writeFileSync(
		file,
		`"use strict";
(async () => {
	for await (const chunk of process.stdin) String(chunk);
	process.stdout.write(${JSON.stringify(output)});
	process.exitCode = ${code || 0};
})();
`
	);
	return file;
};

/**
 * @param {string} entry the stand-in worker
 * @returns {Promise<Error>} what measuring it rejected with
 */
const rejection = async (entry) => {
	try {
		await measureInWorker(entry, "parse", "stylis", "a{}");
	} catch (error) {
		return /** @type {Error} */ (error);
	}
	throw new Error("expected the measurement to reject");
};

describe("compare-tools-harness", () => {
	beforeAll(() => {
		directory = fs.mkdtempSync(path.join(os.tmpdir(), "compare-tools-"));
	});

	afterAll(() => {
		fs.rmSync(directory, { recursive: true, force: true });
	});

	describe("measureInWorker", () => {
		it("reads back the measurement a worker wrote", async () => {
			const entry = workerWriting(
				JSON.stringify({ code: "a{}", wall: 1, cpu: 2, peak: 3 })
			);
			await expect(
				measureInWorker(entry, "minify", "webpack", "a { }")
			).resolves.toEqual({ code: "a{}", wall: 1, cpu: 2, peak: 3 });
		});

		// A tool writing to stdout of its own lands here, and the parse used to
		// throw inside the close listener, where nothing named the tool.
		it("names the tool when the output will not parse", async () => {
			const entry = workerWriting("a native warning nobody asked for");
			expect((await rejection(entry)).message).toBe(
				"measuring stylis wrote unreadable output: a native warning nobody asked for"
			);
		});

		// Asserted whole rather than by substring: 200 characters are a substring
		// of 500, so a truncation that never happened would pass either way.
		it("keeps at most the first 200 characters of it", async () => {
			const entry = workerWriting("x".repeat(500));
			expect((await rejection(entry)).message).toBe(
				`measuring stylis wrote unreadable output: ${"x".repeat(200)}`
			);
		});

		it("reports the code a failing worker exited with", async () => {
			const entry = workerWriting("{}", 3);
			expect((await rejection(entry)).message).toBe(
				"measuring stylis exited with 3"
			);
		});
	});

	describe("formatCost", () => {
		it("rounds the three cells", () => {
			expect(formatCost({ wall: 12.4, cpu: 30.6, peak: 71024 })).toEqual({
				wall: "12",
				cpu: "31",
				peak: "69 MB"
			});
		});

		// A tool working in a service process of its own spends both where this
		// worker cannot see them, so neither is reported as a number.
		it("withholds cpu and peak from a tool that works out of process", () => {
			expect(formatCost({ wall: 22.2, cpu: 1.6, peak: 71024 }, true)).toEqual({
				wall: "22",
				cpu: "-",
				peak: "-"
			});
		});
	});

	describe("filterFrom", () => {
		const VARIABLE = "COMPARE_TOOLS_HARNESS_TEST_FILTER";

		afterEach(() => {
			delete process.env[VARIABLE];
		});

		it("wants every row when the variable is unset", () => {
			expect(filterFrom(VARIABLE)("anything at all")).toBe(true);
		});

		it("wants the rows whose name contains it, whatever the case", () => {
			process.env[VARIABLE] = "LIGHTNING";
			const wanted = filterFrom(VARIABLE);
			expect(wanted("lightningcss+target")).toBe(true);
			expect(wanted("csso")).toBe(false);
		});
	});
});
