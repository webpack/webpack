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

		/**
		 * @param {() => string} answer what `/proc/self/status` reads as
		 * @param {() => Promise<EXPECTED_ANY>} what to run meanwhile
		 * @returns {Promise<EXPECTED_ANY>} whatever it answered
		 */
		const withStatusFile = async (answer, what) => {
			const real = fs.readFileSync;
			const read = jest
				.spyOn(fs, "readFileSync")
				.mockImplementation(
					/** @type {EXPECTED_ANY} */ (
						(
							/** @type {string} */ file,
							/** @type {EXPECTED_ANY} */ options
						) =>
							file === "/proc/self/status"
								? answer()
								: real.call(fs, file, options)
					)
				);
			try {
				return await what();
			} finally {
				read.mockRestore();
			}
		};

		// Where the file is not there to read, and where it is but names no
		// high-water mark: the peak is what the platform itself accounts for.
		it("reports a peak without the status file to read it from", async () => {
			const thrown = await withStatusFile(
				() => {
					throw new Error("ENOENT");
				},
				() => measureHere("parse", "counts", "abcd")
			);
			expect(thrown.peak).toBeGreaterThan(0);
			const unnamed = await withStatusFile(
				() => "Name:\tnode\n",
				() => measureHere("parse", "counts", "abcd")
			);
			expect(unnamed.peak).toBeGreaterThan(0);
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

		// Matched on the name rather than on `ENOENT`: bun says "Executable not
		// found in $PATH" where node spells the errno out.
		it("rejects when it cannot be run at all", async () => {
			await expect(run("no-such-command-anywhere", [])).rejects.toThrow(
				"no-such-command-anywhere"
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

	// The installer is reached through `PATH`, so a stand-in on it exercises the
	// real orchestration without standing in for any of this repo's own code.
	describe("installPackages", () => {
		const NAMES = [
			"compare-tools-harness-unittest-warm",
			"compare-tools-harness-unittest-cold",
			"compare-tools-harness-unittest-failed"
		];

		/**
		 * @param {string} name which cache
		 * @returns {string} where it lives
		 */
		const cacheFor = (name) =>
			path.resolve(__dirname, "..", "node_modules/.cache", name);

		const RAN = "stand-in-npm-ran";

		/**
		 * @param {string} name which cache
		 * @returns {boolean} whether the stand-in npm ran for it
		 */
		const npmRan = (name) => fs.existsSync(path.join(cacheFor(name), RAN));

		/**
		 * @param {string} name which cache
		 * @returns {EXPECTED_ANY} the manifest it holds
		 */
		const manifestOf = (name) =>
			JSON.parse(
				fs.readFileSync(path.join(cacheFor(name), "package.json"), "utf8")
			);

		/**
		 * Run with an `npm` of our own first on `PATH`, so nothing is fetched.
		 * @param {number} code what that npm exits with
		 * @param {() => Promise<EXPECTED_ANY>} what to run meanwhile
		 * @returns {Promise<EXPECTED_ANY>} whatever it answered
		 */
		const withStandInNpm = async (code, what) => {
			const bin = fs.mkdtempSync(path.join(os.tmpdir(), "stand-in-npm-"));
			const npm = path.join(bin, "npm");
			// It leaves the mark in its working directory, which is the cache the
			// install was for, so a test can tell a real install from a skipped one.
			fs.writeFileSync(npm, `#!/bin/sh\n: > ${RAN}\nexit ${code}\n`);
			fs.chmodSync(npm, 0o755);
			const before = process.env.PATH;
			const quiet = jest.spyOn(process.stderr, "write").mockReturnValue(true);

			process.env.PATH = `${bin}${path.delimiter}${before}`;
			try {
				return await what();
			} finally {
				quiet.mockRestore();
				process.env.PATH = before;
				fs.rmSync(bin, { recursive: true, force: true });
			}
		};

		// The stand-in is a shell script, which Windows would pass over in favour
		// of the real npm — and then a test would install over the network.
		const posixOnly = process.platform === "win32" ? it.skip : it;

		/**
		 * @returns {void}
		 */
		const clearCaches = () => {
			for (const name of NAMES) {
				fs.rmSync(cacheFor(name), { recursive: true, force: true });
			}
		};

		// A run interrupted before its `afterAll` leaves a cache behind, and a
		// warm one would send the cold case down the path it exists to cover.
		beforeAll(clearCaches);

		afterAll(clearCaches);

		// Nothing is installed here: the manifest already lists what was asked
		// for, which is the branch that keeps a re-run from reaching npm.
		posixOnly(
			"reuses a cache whose manifest lists the same packages",
			async () => {
				const [name] = NAMES;
				fs.mkdirSync(path.join(cacheFor(name), "node_modules"), {
					recursive: true
				});
				fs.writeFileSync(
					path.join(cacheFor(name), "package.json"),
					JSON.stringify({
						name,
						comparisonPackages: ["left@1", "right@2"]
					})
				);
				// The stand-in fails, so taking the install path would fail the case
				// rather than reach the real npm and the network behind it.
				await withStandInNpm(1, () =>
					expect(installPackages(name, ["left@1", "right@2"])).resolves.toBe(
						cacheFor(name)
					)
				);
				expect(npmRan(name)).toBe(false);
			}
		);

		posixOnly("installs into a cache that has none of it yet", async () => {
			const name = NAMES[1];
			await withStandInNpm(0, () => installPackages(name, ["left@1"]));
			expect(npmRan(name)).toBe(true);
			expect(manifestOf(name).comparisonPackages).toEqual(["left@1"]);
		});

		// The list is what a later run compares against, so recording it before
		// the install succeeded would let a broken cache pass for a warm one.
		posixOnly("records nothing when the install fails", async () => {
			const name = NAMES[2];
			await expect(
				withStandInNpm(1, () => installPackages(name, ["right@2"]))
			).rejects.toThrow("exited with 1");
			expect(npmRan(name)).toBe(true);
			expect(manifestOf(name).comparisonPackages).toBeUndefined();
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
