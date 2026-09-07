"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { Readable } = require("stream");
const {
	compress,
	exists,
	filterFrom,
	formatCost,
	installPackages,
	kb,
	loaderFor,
	log,
	measure,
	measureInWorker,
	run
} = require("../tooling/compare-tools-harness");

/** @type {string} */
let directory;

let made = 0;

/** @type {import("../tooling/compare-tools-harness").Tool[]} */
const TOOLS = [
	{
		name: "counts",
		stage: "parse",
		create: () => (source) => ({ of: source.length })
	},
	{ name: "trims", stage: "minify", create: () => (source) => source.trim() },
	{
		name: "refuses",
		stage: "minify",
		create: () => () => {
			throw new Error("nope\nand more");
		}
	}
];

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

	// Driven in this process rather than in a worker: coverage does not follow a
	// child, and these are the branches that decide what a row reports.
	describe("measure", () => {
		/**
		 * @param {string} stage which table the row belongs to
		 * @param {string} name the tool to run
		 * @param {string} source what to hand it on stdin
		 * @returns {Promise<EXPECTED_ANY>} the report it wrote
		 */
		const measureHere = async (stage, name, source) => {
			const argv = process.argv;
			const stdin = /** @type {PropertyDescriptor} */ (
				Object.getOwnPropertyDescriptor(process, "stdin")
			);
			/** @type {string[]} */
			const written = [];
			const write = jest
				.spyOn(process.stdout, "write")
				.mockImplementation((chunk) => {
					written.push(String(chunk));
					return true;
				});

			process.argv = ["node", "entry.js", "--measure", stage, name];
			Object.defineProperty(process, "stdin", {
				value: Readable.from([Buffer.from(source)]),
				configurable: true
			});
			try {
				await measure(TOOLS);
			} finally {
				write.mockRestore();
				process.argv = argv;
				Object.defineProperty(process, "stdin", stdin);
			}
			return JSON.parse(written.join(""));
		};

		it("reports the text a printing tool wrote, and what it cost", async () => {
			const result = await measureHere("minify", "trims", "  a{}  ");
			expect(result.code).toBe("a{}");
			expect(result.wall).toBeGreaterThanOrEqual(0);
			expect(result.cpu).toBeGreaterThanOrEqual(0);
			expect(result.peak).toBeGreaterThan(0);
		});

		// A parse hands back a tree, which is measured but never reported.
		it("reports no text for a parse", async () => {
			const result = await measureHere("parse", "counts", "abcd");
			expect(result.code).toBeUndefined();
			expect(result.peak).toBeGreaterThan(0);
		});

		// Only the first line: a native tool's panic carries a whole backtrace.
		it("reports the first line of what a tool threw", async () => {
			expect(await measureHere("minify", "refuses", "a{}")).toEqual({
				error: "nope"
			});
		});

		it("refuses a name no tool answers to", async () => {
			await expect(measureHere("minify", "nothing", "a{}")).rejects.toThrow(
				"unknown minify tool nothing"
			);
		});
	});

	describe("sizes", () => {
		it("weighs a buffer under each encoding a CDN serves", async () => {
			const sizes = await compress(Buffer.from("a{color:red}".repeat(200)));
			expect(sizes.raw).toBe(2400);
			expect(sizes.gzip).toBeLessThan(sizes.raw);
			expect(sizes.brotli).toBeLessThan(sizes.raw);
			// zlib carries zstd only from Node 22.15, where the column reads "-".
			expect(sizes.zstd === undefined || sizes.zstd < sizes.raw).toBe(true);
		});

		it("prints a count in KB, and a dash for one it cannot have", () => {
			expect(kb(1536)).toBe("1.5 KB");
			expect(kb(undefined)).toBe("-");
		});
	});

	describe("running a command", () => {
		it("resolves when it exits cleanly", async () => {
			await expect(run(process.execPath, ["-e", ""])).resolves.toBeUndefined();
		});

		it("rejects with the code it exited with", async () => {
			await expect(
				run(process.execPath, ["-e", "process.exitCode = 2"])
			).rejects.toThrow("exited with 2");
		});

		it("rejects when it cannot be run at all", async () => {
			await expect(run("no-such-command-anywhere", [])).rejects.toThrow(
				"ENOENT"
			);
		});
	});

	describe("loaderFor", () => {
		/** @type {string} */
		let cache;

		beforeAll(() => {
			cache = path.join(directory, "cache");
			const plain = path.join(cache, "node_modules", "plain-package");
			fs.mkdirSync(plain, { recursive: true });
			fs.writeFileSync(
				path.join(plain, "package.json"),
				'{ "name": "plain-package", "main": "index.js" }'
			);
			fs.writeFileSync(
				path.join(plain, "index.js"),
				'module.exports = { named: "plain" };'
			);
			const mapped = path.join(cache, "node_modules", "mapped-package");
			fs.mkdirSync(mapped, { recursive: true });
			// No `main`, so only the `exports` map can resolve it — the shape that
			// a joined path reads as missing.
			fs.writeFileSync(
				path.join(mapped, "package.json"),
				'{ "name": "mapped-package", "exports": { ".": "./entry.js" } }'
			);
			fs.writeFileSync(
				path.join(mapped, "entry.js"),
				'module.exports = { named: "mapped" };'
			);
		});

		it("loads a package that names a main", () => {
			expect(loaderFor(cache)("plain-package")).toEqual({ named: "plain" });
		});

		it("loads one that ships only an exports map", () => {
			expect(loaderFor(cache)("mapped-package")).toEqual({ named: "mapped" });
		});

		// The map does not list `./package.json`, so resolving it as a specifier
		// throws and the joined path is what answers.
		it("falls back to the joined path for a subpath the map withholds", () => {
			expect(loaderFor(cache)("mapped-package/package.json").name).toBe(
				"mapped-package"
			);
		});
	});

	describe("installPackages", () => {
		const NAME = "compare-tools-harness-unittest";
		const cache = path.resolve(__dirname, "..", "node_modules/.cache", NAME);

		afterAll(() => {
			fs.rmSync(cache, { recursive: true, force: true });
		});

		// Nothing is installed here: the manifest already lists what was asked
		// for, which is the branch that keeps a re-run from reaching npm.
		it("reuses a cache whose manifest lists the same packages", async () => {
			fs.mkdirSync(path.join(cache, "node_modules"), { recursive: true });
			fs.writeFileSync(
				path.join(cache, "package.json"),
				JSON.stringify({
					name: NAME,
					comparisonPackages: ["left@1", "right@2"]
				})
			);
			await expect(installPackages(NAME, ["left@1", "right@2"])).resolves.toBe(
				cache
			);
		});
	});

	describe("log", () => {
		it("writes the line to stderr", () => {
			const written = jest.spyOn(process.stderr, "write").mockReturnValue(true);
			try {
				log("installing …");
				expect(written).toHaveBeenCalledWith("installing …\n");
			} finally {
				written.mockRestore();
			}
		});
	});

	describe("exists", () => {
		it("answers for a file that is there and one that is not", async () => {
			await expect(exists(__filename)).resolves.toBe(true);
			await expect(exists(`${__filename}.absent`)).resolves.toBe(false);
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
