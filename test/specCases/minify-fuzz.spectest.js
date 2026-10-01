"use strict";

// cspell:ignore ufuzz TOPLEVELS

// Runs terser's fuzzer against webpack's minifier: each seed generates the
// programs terser's ufuzz generates for it, and each is minified under ufuzz's
// option sets and has to print, in terser's sandbox, what it printed before.

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const vm = require("vm");

const referenceDir = path.resolve(__dirname, "../external/terser");
const fuzzerFile = path.join(referenceDir, "test/ufuzz.js");

// Each seed is a test of its own; the same seed generates the same programs.
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const PROGRAMS_PER_SEED = 50;

const GROUP_TIMEOUT = 300000;

// terser's sandbox runs code with no time limit, so an output that never ends
// would hang the suite rather than fail it.
const RUN_TIMEOUT = 5000;

/**
 * terser's program generator, read from the fuzzer it lives in: the fuzzer is
 * a script that minifies as it is read, so only its generator is evaluated.
 * @returns {(seed: number) => () => string} a generator per seed
 */
const readGenerator = () => {
	const text = fs.readFileSync(fuzzerFile, "utf8");
	const start = text.indexOf("var MAX_GENERATED_TOPLEVELS_PER_RUN");
	const end = text.indexOf("function println(");
	const seeded = "var RANDOM_SEED = Date.now();";
	if (start === -1 || end === -1 || !text.includes(seeded)) {
		throw new Error(`terser's generator moved in ${fuzzerFile}`);
	}
	const body = text
		.slice(start, end)
		.replace(seeded, "var RANDOM_SEED = seed;")
		// Its command line is the test runner's, which it must not read.
		.replace(/process\.argv/g, "argv");
	// eslint-disable-next-line no-new-func
	const create = new Function(
		"seed",
		"argv",
		`${body}\nreturn createTopLevelCode;`
	);
	return (seed) => create(seed, []);
};

/**
 * @param {string} directory a directory
 * @returns {boolean} whether it holds anything
 */
const isPresent = (directory) =>
	fs.existsSync(directory) && fs.readdirSync(directory).length > 0;

describe("JavaScript minifier under terser's fuzzer", () => {
	if (!isPresent(referenceDir)) {
		it("submodule not initialized (run `git submodule update --init --depth 1 test/external/terser`)", () => {
			// No-op: the fuzzer is an optional git submodule.
		});

		return;
	}

	describe("ufuzz", () => {
		const { runInNewContext } = vm;
		/** @type {{ minify?: (code: string, options: EXPECTED_OBJECT) => Promise<{ code?: string }>, sandbox?: EXPECTED_ANY, generator?: (seed: number) => () => string }} */
		const loaded = {};
		// The sets ufuzz minifies a program under, then the one webpack's minimizer
		// uses, and the one ufuzz falls back to where the program itself throws.
		const optionSets = [
			...JSON.parse(
				fs.readFileSync(path.join(referenceDir, "test/ufuzz.json"), "utf8")
			),
			{ compress: { passes: 2 }, mangle: true }
		];
		const fallbackSets = [{ compress: false, mangle: false }];

		beforeAll(async () => {
			loaded.minify = (
				await require("../../lib/javascript/syntax").printer.load()
			).minify;
			// eslint-disable-next-line no-new-func
			const importModule = new Function("specifier", "return import(specifier)");
			loaded.sandbox = await importModule(
				pathToFileURL(path.join(referenceDir, "test/sandbox.js")).href
			);
			loaded.generator = readGenerator();
			vm.runInNewContext = (code, context, options) =>
				runInNewContext(code, context, { ...options, timeout: RUN_TIMEOUT });
		});

		afterAll(() => {
			vm.runInNewContext = runInNewContext;
		});

		it("should generate the same programs for the same seed", () => {
			const generator = /** @type {NonNullable<typeof loaded.generator>} */ (
				loaded.generator
			);
			const first = generator(1);
			const again = generator(1);
			const other = generator(2);
			const programs = [first(), first()];

			expect([again(), again()]).toEqual(programs);
			expect(other()).not.toBe(programs[0]);
			expect(programs[0]).toMatch(/^var _calls_ = 10/m);
		});

		for (const seed of SEEDS) {
			it(
				`should print what each program prints: seed ${seed}`,
				async () => {
					const minify = /** @type {NonNullable<typeof loaded.minify>} */ (
						loaded.minify
					);
					const { run_code: runCode, same_stdout: sameStdout } = loaded.sandbox;
					const next = /** @type {NonNullable<typeof loaded.generator>} */ (
						loaded.generator
					)(seed);
					/** @type {string[]} */
					const failures = [];
					for (let round = 1; round <= PROGRAMS_PER_SEED; round++) {
						const program = next();
						const expected = runCode(program);
						const throws = typeof expected !== "string";
						// As ufuzz runs it: an output already run prints the same.
						/** @type {Set<string>} */
						const seen = new Set();
						for (const options of throws ? fallbackSets : optionSets) {
							let printed;
							let code;
							try {
								code = /** @type {string} */ (
									(await minify(program, JSON.parse(JSON.stringify(options)))).code
								);
							} catch (err) {
								printed = /** @type {Error} */ (err);
							}
							if (code !== undefined) {
								if (seen.has(code)) continue;
								seen.add(code);
								printed = runCode(code);
							}
							// As ufuzz judges it: a program that throws passes where the
							// output throws the same kind of error.
							const same = throws
								? typeof printed !== "string" && printed.name === expected.name
								: sameStdout(expected, printed);
							if (!same) {
								failures.push(
									`round ${round} ${JSON.stringify(options)}\n\tprogram:  ${program}\n\toutput:   ${code}\n\texpected: ${String(expected)}\n\tprinted:  ${String(printed)}`
								);
								break;
							}
						}
						// As ufuzz stops: a program that misprints is the finding, and an
						// output that loops would spend the run's time limit on every one after.
						if (failures.length > 0) break;
					}

					expect(failures).toEqual([]);
				},
				GROUP_TIMEOUT
			);
		}
	});
});
