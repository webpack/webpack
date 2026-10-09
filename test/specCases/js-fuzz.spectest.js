"use strict";

// cspell:ignore fargs

// Generates programs from fixed seeds and holds webpack's parser to acorn's tree
// on each program and each output, its printer to the tree it read and to its
// own output, and its minifier to what each program prints.

const vm = require("vm");
const acorn = require("acorn");
const { parse } = require("../../lib/javascript/syntax").parser;
const { firstDifference } = require("../helpers/compareParserOutput");
const { createProgramGenerator } = require("../helpers/jsFuzzProgram");

/** @typedef {(code: string, options: EXPECTED_OBJECT) => Promise<{ code?: string }>} Minify */

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const PROGRAMS_PER_SEED = Number(process.env.JS_FUZZ_PROGRAMS) || 50;
const SEED_TIMEOUT = 300000;
// A program's synchronous part, bounded so an output that loops fails the case
// instead of hanging the suite.
const RUN_TIMEOUT = 5000;

const PRINT_ONLY = { compress: false, mangle: false };

// What an output must still print under: the printer alone, the sets terser's
// ufuzz runs, and webpack's own minimizer options.
const OPTION_SETS = [
	PRINT_ONLY,
	{ compress: false },
	{ mangle: false },
	{},
	{ toplevel: true },
	{ compress: { passes: 1e6, unsafe: true }, toplevel: true },
	// ufuzz's, less `keep_fargs: false`: by contract that changes a function's
	// `length`, which these programs read.
	{
		compress: {
			arguments: true,
			passes: 1e6,
			sequences: 1e6,
			unsafe: true,
			unsafe_Function: true,
			unsafe_math: true,
			unsafe_proto: true,
			unsafe_regexp: true
		}
	},
	{ safari10: true },
	{ compress: { reduce_funcs: false } },
	{ compress: { passes: 2 }, mangle: true },
	{ compress: { passes: 2 }, mangle: true, toplevel: true }
];

// V8 reads every argument before an unparenthesized array destructuring
// assignment as a pattern, refusing `f(a += 1, [b] = c)` and `f([...a, b], [c]
// = d)` though the spec allows both and terser writes them alike.
const V8_ARGUMENTS_AS_PATTERN = "V8 reads the arguments as a pattern";

// Outputs the spec allows that the engine refuses, by the message it refuses
// them with: each is the engine's defect.
const ENGINE_REFUSALS = new Map([
	["Invalid destructuring assignment target", V8_ARGUMENTS_AS_PATTERN],
	["Rest element must be last element", V8_ARGUMENTS_AS_PATTERN]
]);

/**
 * Whether the engine refuses a program acorn reads, for a reason
 * `ENGINE_REFUSALS` lists.
 * @param {string} code the program
 * @returns {boolean} whether it is refused for a listed reason
 */
const refusedByEngine = (code) => {
	try {
		// eslint-disable-next-line no-new
		new vm.Script(code);
		return false;
	} catch (err) {
		return ENGINE_REFUSALS.has(/** @type {Error} */ (err).message);
	}
};

/**
 * The seeds to run: the fixed ones, or the one `JS_FUZZ_SEED` names, where
 * `random` picks one and the test's name says which, to replay it.
 * @returns {number[]} the seeds
 */
const seedsToRun = () => {
	const given = process.env.JS_FUZZ_SEED;
	if (given === undefined || given === "") return SEEDS;
	if (given === "random") return [Math.floor(Math.random() * 2 ** 31)];
	return [Number(given)];
};

/**
 * What a program prints and, if it throws, the kind of error, after the
 * promise jobs it queued have run.
 * @param {string} code the program
 * @returns {Promise<string>} its transcript
 */
const run = async (code) => {
	/** @type {string[]} */
	const lines = [];
	const context = vm.createContext({
		console: { log: (/** @type {string} */ line) => lines.push(line) }
	});
	try {
		vm.runInContext(code, context, { timeout: RUN_TIMEOUT });
	} catch (err) {
		const error = /** @type {Error} */ (err);
		lines.push(`threw <${error && error.name}>`);
	}
	await new Promise((resolve) => {
		setImmediate(resolve);
	});
	return lines.join("\n");
};

/**
 * webpack's parser given what a build gives it: ranges served lazily.
 * @param {string} code the source
 * @returns {import("estree").Program} the program
 */
const parseOurs = (code) =>
	parse(code, {
		sourceType: "script",
		ecmaVersion: "latest",
		ranges: false,
		lazyNodes: true
	});

/**
 * acorn's tree for a source.
 * @param {string} code the source
 * @param {boolean} ranges whether nodes carry `range`
 * @returns {import("acorn").Program} the program
 */
const parseAcorn = (code, ranges) =>
	acorn.parse(code, { sourceType: "script", ecmaVersion: "latest", ranges });

/**
 * A tree with what printing may respell taken out: positions, a literal's or an
 * untagged template's spelling, a key's quotes, and nested sequences' commas.
 * @param {unknown} node a node or value
 * @param {boolean=} tagged whether a template's raw text is observable here
 * @returns {unknown} it, normalized
 */
const normalize = (node, tagged) => {
	if (Array.isArray(node)) return node.map((item) => normalize(item));
	if (node === null || typeof node !== "object") return node;
	const source = /** @type {Record<string, EXPECTED_ANY>} */ (node);
	if (source.type === "SequenceExpression") {
		return {
			type: source.type,
			expressions: source.expressions.flatMap(
				(/** @type {EXPECTED_ANY} */ item) => {
					const one = /** @type {Record<string, EXPECTED_ANY>} */ (
						normalize(item)
					);
					return one.type === "SequenceExpression" ? one.expressions : [one];
				}
			)
		};
	}
	/** @type {Record<string, unknown>} */
	const out = {};
	for (const key of Object.keys(source)) {
		if (key === "start" || key === "end" || key === "range") continue;
		if (key === "raw" && source.type === "Literal") continue;
		if (source.type === "TemplateElement" && key === "value" && !tagged) {
			out.value = source.value.cooked;
			continue;
		}
		out[key] =
			source.type === "TemplateLiteral" && key === "quasis"
				? source.quasis.map(
						(/** @type {EXPECTED_ANY} */ quasi) => normalize(quasi, tagged)
					)
				: normalize(
						source[key],
						source.type === "TaggedTemplateExpression" && key === "quasi"
					);
	}
	if (
		(source.type === "Property" ||
			source.type === "PropertyDefinition" ||
			source.type === "MethodDefinition") &&
		!source.computed &&
		source.key.type !== "PrivateIdentifier"
	) {
		out.key = String(
			source.key.type === "Identifier" ? source.key.name : source.key.value
		);
		delete out.shorthand;
	}
	return out;
};

/**
 * Where webpack's parser and acorn's disagree on a source, or why neither reads it.
 * @param {string} code the source
 * @returns {string | undefined} the disagreement
 */
const parserDifference = (code) => {
	let ours;
	try {
		ours = parseOurs(code);
	} catch (err) {
		return `rejects it: ${/** @type {Error} */ (err).message}`;
	}
	let theirs;
	try {
		theirs = parseAcorn(code, true);
	} catch (err) {
		return `acorn rejects it: ${/** @type {Error} */ (err).message}`;
	}
	const difference = firstDifference(ours, theirs, "program");
	return difference
		? `differs from acorn at ${difference.at}: ${difference.ours} vs ${difference.acorn}`
		: undefined;
};

/**
 * The first check one program fails, or none.
 * @param {string} program the program
 * @param {Minify} minify webpack's minifier
 * @returns {Promise<string | undefined>} the first failure
 */
const checkProgram = async (program, minify) => {
	const parsed = parserDifference(program);
	if (parsed !== undefined) return `parser: ${parsed}`;

	/**
	 * @param {string} code a source
	 * @param {EXPECTED_OBJECT} options the minifier's options
	 * @returns {Promise<string>} what the minifier writes
	 */
	const write = async (code, options) =>
		/** @type {string} */ (
			(await minify(code, JSON.parse(JSON.stringify(options)))).code
		);

	const expected = await run(program);
	const read = normalize(parseAcorn(program, false));
	/** @type {Set<string>} */
	const seen = new Set();
	for (const options of OPTION_SETS) {
		const label = JSON.stringify(options);
		let code;
		try {
			code = await write(program, options);
		} catch (err) {
			return `minify ${label}: throws ${/** @type {Error} */ (err).message}`;
		}
		if (seen.has(code)) continue;
		seen.add(code);
		const parsedOutput = parserDifference(code);
		if (parsedOutput !== undefined) {
			return `minify ${label}: parser on the output: ${parsedOutput}\n\toutput: ${code}`;
		}
		// `safari10` is a format option too: it keeps what works around Safari 10.
		const reprinted = await write(
			code,
			"safari10" in options ? { ...PRINT_ONLY, safari10: true } : PRINT_ONLY
		);
		if (reprinted !== code) {
			return `minify ${label}: printer writes its output otherwise\n\toutput:    ${code}\n\treprinted: ${reprinted}`;
		}
		if (options === PRINT_ONLY) {
			const difference = firstDifference(
				normalize(parseAcorn(code, false)),
				read,
				"program"
			);
			if (difference) {
				return `printer: reads back differently at ${difference.at}: ${difference.ours} vs ${difference.acorn}\n\toutput: ${code}`;
			}
		}
		const printed = await run(code);
		if (printed !== expected && !refusedByEngine(code)) {
			return `minify ${label}: prints differently\n\toutput: ${code}\n\texpected:\n${expected}\n\tprinted:\n${printed}`;
		}
	}
	return undefined;
};

describe("JavaScript fuzzer", () => {
	/** @type {{ minify?: Minify }} */
	const loaded = {};

	beforeAll(async () => {
		loaded.minify = (
			await require("../../lib/javascript/syntax").printer.load()
		).minify;
	});

	it("should write the same programs for the same seed", () => {
		const first = createProgramGenerator(1);
		const again = createProgramGenerator(1);
		const programs = [first(), first()];

		expect([again(), again()]).toEqual(programs);
		expect(createProgramGenerator(2)()).not.toBe(programs[0]);
	});

	for (const seed of seedsToRun()) {
		it(
			`should parse, print and minify what each program means: seed ${seed}`,
			async () => {
				const minify = /** @type {Minify} */ (loaded.minify);
				const next = createProgramGenerator(seed);
				/** @type {string[]} */
				const failures = [];
				for (let round = 1; round <= PROGRAMS_PER_SEED; round++) {
					const program = next();
					const failure = await checkProgram(program, minify);
					// A failing program is the finding: the rest of the seed waits on it.
					if (failure !== undefined) {
						failures.push(`round ${round}: ${failure}\n\tprogram:\n${program}`);
						break;
					}
				}

				expect(failures).toEqual([]);
			},
			SEED_TIMEOUT
		);
	}
});
