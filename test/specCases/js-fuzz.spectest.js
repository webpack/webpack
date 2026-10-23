"use strict";

// cspell:ignore fargs fnames funs

// Generates programs from fixed seeds and holds webpack's parser to acorn's tree
// on each program and each output, its printer to the tree it read and to its
// own output, and its minifier to what each program prints and exports, to a
// source map fitting its output, and to what its output prints minified again.

const vm = require("vm");
const acorn = require("acorn");
const {
	SourceProcessor,
	parser: { collectCjsRequireSpecifiers, parse }
} = require("../../lib/javascript/syntax");
const { decodeMappings } = require("../../lib/util/createMappings");
const { firstDifference } = require("../../tooling/compare-js-tools");
const {
	DEPENDENCY,
	createProgramGenerator,
	createRandom,
	createRegExpGenerator,
	createRequireSourceGenerator
} = require("../helpers/jsFuzzProgram");

/** @typedef {(code: string | Record<string, string> | EXPECTED_OBJECT, options: EXPECTED_OBJECT) => Promise<{ code?: string, map?: string, ast?: EXPECTED_OBJECT, timings?: Record<string, number> }>} Minify */
/** @typedef {import("../helpers/jsFuzzProgram").Program} Program */
/** @typedef {Record<string, EXPECTED_ANY>} MinifyOptions */

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const PROGRAMS_PER_SEED = Number(process.env.JS_FUZZ_PROGRAMS) || 50;
const SEED_TIMEOUT = 300000;
const REGEXPS_PER_SEED = 400;
const REQUIRE_SOURCES_PER_SEED = 200;
// The minifier's other ways in and out minify each program ten times more, so
// one program in this many meets them.
const INTERFACE_EVERY = 5;
// A program's synchronous part, bounded so an output that loops fails the case
// instead of hanging the suite.
const RUN_TIMEOUT = 5000;

const PRINT_ONLY = { compress: false, mangle: false };
// webpack's defaults: their output is also mapped, and minified a second time.
const DEFAULTS = {};
const STRONGEST = { compress: { passes: 2 }, mangle: true, toplevel: true };

// What an output must still print under: the printer alone, the sets terser's
// ufuzz runs, and webpack's own minimizer options.
const OPTION_SETS = [
	PRINT_ONLY,
	{ compress: false },
	{ mangle: false },
	DEFAULTS,
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
	STRONGEST
];

// The compress options a program must print the same under, on or off; the
// unsafe ones, `keep_fargs`, `pure_getters` and `pure_new` change by contract
// what these programs observe.
const COMPRESS_FLAGS = [
	"arrows",
	"booleans",
	"collapse_vars",
	"comparisons",
	"computed_props",
	"conditionals",
	"dead_code",
	"directives",
	"evaluate",
	"hoist_funs",
	"hoist_props",
	"hoist_vars",
	"if_return",
	"join_vars",
	"keep_classnames",
	"keep_fnames",
	"keep_infinity",
	"loops",
	"negate_iife",
	"properties",
	"reduce_funcs",
	"reduce_vars",
	"sequences",
	"side_effects",
	"switches",
	"typeofs",
	"unused"
];

// The format options and the values each is tried with.
/** @type {[string, unknown[]][]} */
const FORMAT_CHOICES = [
	["ascii_only", [true, false]],
	["beautify", [true, false]],
	["braces", [true, false]],
	["comments", [false, "all", "some"]],
	["indent_level", [0, 2, 4]],
	["ecma", [5, 2015, 2020]],
	["keep_numbers", [true, false]],
	["keep_quoted_props", [true, false]],
	["max_line_len", [false, 60]],
	["preserve_annotations", [true, false]],
	["quote_style", [0, 1, 2, 3]],
	["semicolons", [true, false]],
	["wrap_func_args", [true, false]],
	["wrap_iife", [true, false]]
];

/**
 * Options picked at random from what a program must print the same under, so
 * each program meets option combinations no fixed set names.
 * @param {() => number} random a number in [0, 1) per call
 * @returns {MinifyOptions} the options
 */
const randomOptions = (random) => {
	/**
	 * @template T
	 * @param {T[]} list the choices
	 * @returns {T} one of them
	 */
	const pick = (list) => list[Math.floor(random() * list.length)];
	/** @type {MinifyOptions} */
	const compress = {};
	for (const name of COMPRESS_FLAGS) {
		if (random() < 0.3) compress[name] = random() < 0.5;
	}
	if (random() < 0.3) compress.passes = pick([1, 2, 3]);
	if (random() < 0.3) compress.inline = pick([0, 1, 2, 3]);
	if (random() < 0.3) compress.ecma = pick([5, 2015, 2020]);
	if (random() < 0.2) compress.pure_conversions = false;
	if (random() < 0.2) compress.sequences = pick([true, false, 3]);
	if (random() < 0.2) compress.drop_debugger = pick([true, false]);
	/** @type {MinifyOptions} */
	const format = {};
	for (const [name, values] of FORMAT_CHOICES) {
		if (random() < 0.3) format[name] = pick(values);
	}
	return {
		compress: random() < 0.1 ? false : compress,
		mangle: pick([
			false,
			true,
			{ keep_fnames: true },
			{ toplevel: true },
			{ keep_classnames: true }
		]),
		format,
		toplevel: random() < 0.5,
		keep_classnames: random() < 0.2,
		keep_fnames: random() < 0.2,
		ie8: random() < 0.1,
		safari10: random() < 0.1
	};
};

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
 * @param {boolean} isModule whether it is a module
 * @returns {boolean} whether it is refused for a listed reason
 */
const refusedByEngine = (code, isModule) => {
	const message = compileError(code, isModule);
	return message !== undefined && ENGINE_REFUSALS.has(message);
};

/**
 * @param {string} code the program
 * @param {boolean} isModule whether it is a module
 * @returns {string | undefined} why the engine does not compile it, if it does not
 */
const compileError = (code, isModule) => {
	try {
		// eslint-disable-next-line no-new
		if (isModule) new vm.SourceTextModule(code);
		// eslint-disable-next-line no-new
		else new vm.Script(code);
		return undefined;
	} catch (err) {
		return /** @type {Error} */ (err).message;
	}
};

/**
 * acorn's tree for a source the engine compiles, or `undefined` where acorn
 * refuses it, as it refuses `yield /a/` in a generator method.
 * @param {string} code the source
 * @param {boolean} isModule whether it is a module
 * @param {boolean} ranges whether nodes carry `range`
 * @returns {import("acorn").Program | undefined} the program
 */
const parseAcornUnlessDefect = (code, isModule, ranges) => {
	try {
		return parseAcorn(code, isModule, ranges);
	} catch (err) {
		if (compileError(code, isModule) === undefined) return undefined;
		throw err;
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
 * The identifier written at an offset, its escapes decoded.
 * @param {string} code the source
 * @param {number} offset where it starts
 * @returns {string} the identifier, or "" where none starts
 */
const identifierAt = (code, offset) => {
	const match = /^(?:[\p{ID_Continue}$\u200C\u200D]|\\u[\da-fA-F]{4}|\\u\{[\da-fA-F]+\})+/u.exec(
		code.slice(offset)
	);
	return match === null
		? ""
		: match[0].replace(/\\u\{?([\da-fA-F]+)\}?/g, (_, hex) =>
				String.fromCodePoint(Number.parseInt(hex, 16))
			);
};

/**
 * Why a source map does not fit its output and source: a mapping outside
 * either, or a name the source does not hold where the mapping points.
 * @param {string} code the output
 * @param {string} source the source
 * @param {string} map the source map
 * @param {boolean=} named whether names are checked: terser maps a method's
 * name at the key's end, so a map read in names the token before it
 * @returns {string | undefined} the misfit
 */
const sourceMapMisfit = (code, source, map, named = true) => {
	const { mappings, names } = JSON.parse(map);
	const outputLines = code.split("\n");
	const sourceLines = source.split("\n");
	const decoded = decodeMappings(mappings);
	for (let line = 0; line < decoded.length; line++) {
		for (const segment of decoded[line]) {
			const [column, index, originalLine, originalColumn, name] = segment;
			if (line >= outputLines.length || column > outputLines[line].length) {
				return `maps ${line}:${column}, past the output`;
			}
			if (index === undefined) continue;
			const text = sourceLines[/** @type {number} */ (originalLine)];
			if (index !== 0 || text === undefined || /** @type {number} */ (originalColumn) > text.length) {
				return `maps ${line}:${column} to ${originalLine}:${originalColumn}, past the source`;
			}
			if (name === undefined || !named) continue;
			const at = /** @type {number} */ (originalColumn);
			// terser maps a computed key's `[` under the key's name too.
			if (text[at] === "[") continue;
			// A quoted key is mapped by its text, a private name without its `#`.
			const quoted = /^(["'])(.*?)\1/.exec(text.slice(at));
			const written =
				quoted === null
					? identifierAt(text, text[at] === "#" ? at + 1 : at)
					: quoted[2];
			if (written !== names[name]) {
				return `maps ${line}:${column} to ${originalLine}:${originalColumn} named ${names[name]}, where the source holds ${JSON.stringify(text.slice(/** @type {number} */ (originalColumn), /** @type {number} */ (originalColumn) + 20))}`;
			}
		}
	}
	return undefined;
};

/**
 * A module's exports, by name, with what each holds at the end.
 * @param {Record<string, unknown>} namespace the module's namespace
 * @returns {string} them, one `name:value` per export
 */
const showExports = (namespace) =>
	Object.keys(namespace)
		.map((name) => {
			let value;
			try {
				value = namespace[name];
			} catch (_err) {
				return `${name}:<uninitialized>`;
			}
			const type = typeof value;
			if (type === "function") return `${name}:[function]`;
			if (type === "object" && value !== null) {
				return `${name}:{${Object.keys(value).join(",")}}`;
			}
			return `${name}:${type === "bigint" ? `${value}n` : JSON.stringify(value)}`;
		})
		.join(" ");

/**
 * What a program prints and, if it throws, the kind of error, after the
 * promise jobs it queued have run.
 * @param {string} code the program
 * @param {boolean} isModule whether it runs as a module, which may import `dep`
 * @param {string=} functionText what a function's `toString` returns
 * @returns {Promise<string>} its transcript
 */
const run = async (code, isModule, functionText = "[function]") => {
	/** @type {string[]} */
	const lines = [];
	const context = vm.createContext({
		console: { log: (/** @type {string} */ line) => lines.push(line) },
		_functionText: functionText
	});
	try {
		if (isModule) {
			const dependency = new vm.SourceTextModule(DEPENDENCY, { context });
			const evaluated = new vm.SourceTextModule(code, {
				context,
				initializeImportMeta: (meta) => {
					meta.url = "fuzz:main";
				},
				// `dep` imported only dynamically is linked and run on demand.
				importModuleDynamically: async () => {
					if (dependency.status === "unlinked") {
						await dependency.link(() => {
							throw new Error("dep imports nothing");
						});
					}
					if (dependency.status === "linked") await dependency.evaluate();
					return dependency;
				}
			});
			try {
				await evaluated.link((specifier) => {
					if (specifier === "dep") return dependency;
					throw new Error(`a fuzzed module imports only dep, not ${specifier}`);
				});
				await evaluated.evaluate({ timeout: RUN_TIMEOUT });
			} finally {
				// What it exports, by name: what the minifier must keep.
				if (evaluated.status !== "unlinked" && evaluated.status !== "linking") {
					lines.push(`exports ${showExports(evaluated.namespace)}`);
				}
			}
		} else {
			vm.runInContext(code, context, { timeout: RUN_TIMEOUT });
		}
	} catch (err) {
		// A thrown object's `name`, as `_error` reads it: mangling renames a
		// thrown function's.
		const error = /** @type {Error} */ (err);
		lines.push(
			`threw <${
				error !== null && typeof error === "object" && typeof error.name === "string"
					? error.name
					: typeof error
			}>`
		);
	}
	await new Promise((resolve) => {
		setImmediate(resolve);
	});
	return lines.join("\n");
};

/**
 * webpack's parser given what a build gives it: ranges served lazily.
 * @param {string} code the source
 * @param {boolean} isModule whether it is a module
 * @returns {import("estree").Program} the program
 */
const parseOurs = (code, isModule) =>
	parse(code, {
		sourceType: isModule ? "module" : "script",
		ecmaVersion: "latest",
		ranges: false,
		lazyNodes: true
	});

/**
 * acorn's tree for a source.
 * @param {string} code the source
 * @param {boolean} isModule whether it is a module
 * @param {boolean} ranges whether nodes carry `range`
 * @returns {import("acorn").Program} the program
 */
const parseAcorn = (code, isModule, ranges) =>
	acorn.parse(code, {
		sourceType: isModule ? "module" : "script",
		ecmaVersion: "latest",
		ranges
	});

/**
 * A tree with what printing may respell taken out: positions, a literal's or an
 * untagged template's spelling, a key's quotes, nested sequences' commas and
 * empty statements.
 * @param {unknown} node a node or value
 * @param {boolean=} tagged whether a template's raw text is observable here
 * @returns {unknown} it, normalized
 */
const normalize = (node, tagged) => {
	if (Array.isArray(node)) {
		// An empty statement in a list, as after `export default function () {}`,
		// prints as nothing.
		return node
			.filter((item) => !(item !== null && item.type === "EmptyStatement"))
			.map((item) => normalize(item));
	}
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
		if (key === "start" || key === "end" || key === "range" || key === "loc") continue;
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
	// An anonymous function or class exported as a value, printed bare as terser
	// prints it, reads back as the declaration it can only differ from in hoisting.
	if (
		source.type === "ExportDefaultDeclaration" &&
		(source.declaration.type === "FunctionExpression" ||
			source.declaration.type === "ClassExpression") &&
		source.declaration.id === null
	) {
		const declaration = /** @type {Record<string, unknown>} */ (out.declaration);
		declaration.type = source.declaration.type.replace("Expression", "Declaration");
	}
	return out;
};

/**
 * A source's tokens, without the line breaks and comments printing a second
 * time may move; read by parsing, which tells a regular expression from `/`.
 * @param {string} code the source
 * @param {boolean} isModule whether it is a module
 * @returns {string} its tokens, one per line
 */
const tokensOf = (code, isModule) => {
	/** @type {string[]} */
	const tokens = [];
	acorn.parse(code, {
		sourceType: isModule ? "module" : "script",
		ecmaVersion: "latest",
		onToken: (token) => {
			if (token.type === acorn.tokTypes.eof) return;
			tokens.push(code.slice(token.start, token.end));
		}
	});
	// A `;` before a `}` or the end is printed or not by where comments fall.
	return tokens
		.filter(
			(token, index) =>
				token !== ";" ||
				(index + 1 < tokens.length && tokens[index + 1] !== "}")
		)
		.join("\n");
};

/**
 * Where webpack's parser and acorn's disagree on a source, or why neither reads it.
 * @param {string} code the source
 * @param {boolean} isModule whether it is a module
 * @returns {string | undefined} the disagreement
 */
const parserDifference = (code, isModule) => {
	let ours;
	try {
		ours = parseOurs(code, isModule);
	} catch (err) {
		return `rejects it: ${/** @type {Error} */ (err).message}`;
	}
	let theirs;
	try {
		theirs = parseAcornUnlessDefect(code, isModule, true);
	} catch (err) {
		return `acorn rejects it: ${/** @type {Error} */ (err).message}`;
	}
	if (theirs === undefined) return undefined;
	const difference = firstDifference(ours, theirs, "program");
	if (difference) {
		return `differs from acorn at ${difference.at}: ${difference.ours} vs ${difference.acorn}`;
	}
	return eagerParserDifference(code, isModule);
};

/**
 * Where webpack's parser off the lazy path, as a plugin asking for locations
 * gets it, disagrees with acorn on a source's tree or comments.
 * @param {string} code a source both parsers read
 * @param {boolean} isModule whether it is a module
 * @returns {string | undefined} the disagreement
 */
const eagerParserDifference = (code, isModule) => {
	const options = {
		sourceType: isModule ? "module" : "script",
		ecmaVersion: "latest",
		ranges: true,
		locations: true
	};
	/** @type {unknown[]} */
	const ourComments = [];
	/** @type {import("acorn").Comment[]} */
	const theirComments = [];
	let ours;
	try {
		ours = parse(code, { ...options, lazyNodes: false, onComment: ourComments });
	} catch (err) {
		return `rejects it with locations: ${/** @type {Error} */ (err).message}`;
	}
	const theirs = acorn.parse(code, {
		.../** @type {import("acorn").Options} */ (options),
		onComment: theirComments
	});
	const difference =
		firstDifference(ours, theirs, "program") ||
		firstDifference(ourComments, theirComments, "comments");
	return difference
		? `differs from acorn with locations at ${difference.at}: ${difference.ours} vs ${difference.acorn}`
		: undefined;
};

/**
 * Where a program given as acorn's tree, or an output given back as one, is
 * printed or minified otherwise than its source; nothing where acorn refuses it.
 * @param {string} source the program
 * @param {boolean} isModule whether it is a module
 * @param {string} code the output
 * @param {string} expected what the program prints
 * @param {(input: string | EXPECTED_OBJECT, more: MinifyOptions) => ReturnType<Minify>} write the minifier under the output's options
 * @returns {Promise<string | undefined>} the disagreement
 */
const estreeDifference = async (source, isModule, code, expected, write) => {
	const tree = () => parseAcornUnlessDefect(source, isModule, false);
	if (tree() === undefined) return undefined;
	const printedTree = /** @type {string} */ (
		(await write(tree(), { ...PRINT_ONLY, parse: { spidermonkey: true } })).code
	);
	const printedSource = /** @type {string} */ ((await write(source, PRINT_ONLY)).code);
	const ours = parseAcornUnlessDefect(printedTree, isModule, false);
	const theirs = parseAcornUnlessDefect(printedSource, isModule, false);
	const difference =
		ours && theirs && firstDifference(normalize(ours), normalize(theirs), "program");
	if (difference) {
		return `prints an ESTree tree otherwise at ${difference.at}: ${difference.ours} vs ${difference.acorn}\n\tprinted: ${printedTree}`;
	}
	const fromTree = /** @type {string} */ (
		(await write(tree(), { parse: { spidermonkey: true } })).code
	);
	if ((await run(fromTree, isModule)) !== expected) {
		return `minifies an ESTree tree into what prints differently: ${fromTree}`;
	}
	// The tree given back, read in again, prints as the output.
	const toTree = await write(source, { format: { spidermonkey: true } });
	const roundTrip = /** @type {string} */ (
		(await write(/** @type {EXPECTED_OBJECT} */ (toTree.ast), {
			...PRINT_ONLY,
			parse: { spidermonkey: true }
		})).code
	);
	const back = parseAcornUnlessDefect(roundTrip, isModule, false);
	const printed = parseAcornUnlessDefect(code, isModule, false);
	const backDifference =
		back && printed && firstDifference(normalize(back), normalize(printed), "program");
	if (backDifference) {
		return `gives back an ESTree tree that prints otherwise at ${backDifference.at}: ${backDifference.ours} vs ${backDifference.acorn}\n\tprinted: ${roundTrip}`;
	}
	return undefined;
};

/**
 * Where the minifier's other ways in and out disagree with a plain call: input
 * as named files or an ESTree tree, the tree given back, a name cache, timings,
 * and a source map read in, as an index map, inline or with its sources.
 * @param {string} source the program
 * @param {boolean} isModule whether it is a module
 * @param {MinifyOptions} options the options the output was written under
 * @param {string} code the output
 * @param {string} map the output's source map
 * @param {Minify} minify webpack's minifier
 * @returns {Promise<string | undefined>} the disagreement
 */
const interfaceDifference = async (source, isModule, options, code, map, minify) => {
	/**
	 * @param {string | Record<string, string> | EXPECTED_OBJECT} input what is minified
	 * @param {MinifyOptions} more the options added
	 * @returns {ReturnType<Minify>} the result
	 */
	const write = (input, more) =>
		minify(input, { ...JSON.parse(JSON.stringify(options)), ...more });

	const named = await write({ "fuzz.js": source, "empty.js": "" }, {});
	if (named.code !== code) return `writes named files otherwise: ${named.code}`;
	// A tree comes without comments, so without the annotations they carry:
	// printed alone it holds the source's tokens, minified it prints the same.
	const expected = await run(source, isModule);
	const treeDifference = await estreeDifference(source, isModule, code, expected, write);
	if (treeDifference !== undefined) return treeDifference;
	const timed = await write(source, { timings: true });
	if (timed.code !== code || typeof (timed.timings && timed.timings.total) !== "number") {
		return "writes otherwise or times nothing with `timings`";
	}
	const nameCache = {};
	for (let time = 0; time < 2; time++) {
		const cached = await write(source, { nameCache, mangle: { toplevel: true } });
		const printed = await run(/** @type {string} */ (cached.code), isModule);
		if (printed !== expected) {
			return `prints differently with a name cache, call ${time + 1}: ${cached.code}`;
		}
	}

	const chained = await write(code, { sourceMap: { content: map } });
	const misfit = sourceMapMisfit(
		/** @type {string} */ (chained.code),
		source,
		/** @type {string} */ (chained.map),
		false
	);
	if (misfit !== undefined) return `source map read in ${misfit}`;
	const index = {
		version: 3,
		sections: [{ offset: { line: 0, column: 0 }, map: JSON.parse(map) }]
	};
	const fromIndex = await write(code, { sourceMap: { content: index } });
	if (fromIndex.map !== chained.map) {
		return "maps otherwise from an index map";
	}
	const inline = await write(
		`${code}\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(map).toString("base64")}`,
		{ sourceMap: { content: "inline", url: "inline", includeSources: true } }
	);
	const [inlineCode, inlineUrl] = /** @type {string} */ (inline.code).split(
		"\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,"
	);
	const inlineMap = JSON.parse(Buffer.from(inlineUrl || "", "base64").toString() || "{}");
	if (
		inlineCode !== chained.code ||
		inlineMap.mappings !== JSON.parse(/** @type {string} */ (chained.map)).mappings ||
		!Array.isArray(inlineMap.sourcesContent)
	) {
		return "maps otherwise read and written inline";
	}
	return undefined;
};

/**
 * @param {MinifyOptions} options the minifier's options
 * @returns {boolean} whether they compress with `unsafe`
 */
const unsafeIn = (options) =>
	typeof options.compress === "object" && options.compress.unsafe === true;

/**
 * The first check one program fails, or none.
 * @param {Program} program the program
 * @param {MinifyOptions[]} optionSets what it is minified under
 * @param {Minify} minify webpack's minifier
 * @param {boolean} interfaces whether the minifier's other ways in and out are checked too
 * @param {{ enabled: boolean }} treePrinting the switch printing a source from its SyntaxTree
 * @returns {Promise<string | undefined>} the first failure
 */
const checkProgram = async (
	{ code: source, module: isModule },
	optionSets,
	minify,
	interfaces,
	treePrinting
) => {
	const parsed = parserDifference(source, isModule);
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

	const expected = await run(source, isModule);
	/** @type {boolean | undefined} */
	let readsFunctionText;
	// `unsafe` folds a function into its source text, which the prelude's
	// `toString` hides, so a program reading the text may print otherwise.
	const foldsFunctionText = async (/** @type {MinifyOptions} */ options) => {
		if (!unsafeIn(options)) return false;
		if (readsFunctionText === undefined) {
			readsFunctionText = false;
			for (const text of ["", "function(a,b1){return 0}"]) {
				if ((await run(source, isModule, text)) !== expected) {
					readsFunctionText = true;
					break;
				}
			}
		}
		return readsFunctionText;
	};
	const tree = parseAcornUnlessDefect(source, isModule, false);
	const read = tree && normalize(tree);
	/** @type {Set<string>} */
	const seen = new Set();
	for (const set of optionSets) {
		// A module is minified as one, strict and its top level its own.
		const options = isModule ? { ...set, module: true } : set;
		const label = JSON.stringify(options);
		let code;
		try {
			code = await write(source, options);
		} catch (err) {
			return `minify ${label}: throws ${/** @type {Error} */ (err).message}`;
		}
		// Uncompressed, the SyntaxTree printer writes what terser's tree prints.
		if (options.compress === false) {
			treePrinting.enabled = false;
			let fromTerser;
			try {
				fromTerser = await write(source, options);
			} finally {
				treePrinting.enabled = true;
			}
			if (fromTerser !== code) {
				return `minify ${label}: the SyntaxTree printer writes otherwise than terser's tree\n\toutput: ${code}\n\tterser's tree: ${fromTerser}`;
			}
		}
		// The SourceProcessor's printer writes what `minify` prints, comments aside.
		if (set === PRINT_ONLY) {
			const uncommented = await write(source, {
				...options,
				format: { comments: false }
			});
			const processed = /** @type {{ code: string }} */ (
				new SourceProcessor().process(source, {
					mode: "minify",
					sourceType: isModule ? "module" : "script"
				})
			).code;
			if (processed !== uncommented) {
				return `SourceProcessor: prints otherwise than minify\n\toutput: ${processed}\n\tminify: ${uncommented}`;
			}
		}
		if (seen.has(code) && set !== DEFAULTS && set !== STRONGEST) continue;
		seen.add(code);
		const parsedOutput = parserDifference(code, isModule);
		if (parsedOutput !== undefined) {
			return `minify ${label}: parser on the output: ${parsedOutput}\n\toutput: ${code}`;
		}
		// Printed again under the same format, `ie8`, `safari10` and `module` included.
		const reprinted = await write(code, {
			...PRINT_ONLY,
			format: options.format,
			ie8: options.ie8,
			safari10: options.safari10,
			module: options.module
		});
		let sameTokens;
		try {
			sameTokens = tokensOf(reprinted, isModule) === tokensOf(code, isModule);
		} catch (err) {
			if (compileError(reprinted, isModule) !== undefined) {
				return `minify ${label}: printer writes its output as what does not parse: ${/** @type {Error} */ (err).message}\n\toutput:    ${code}\n\treprinted: ${reprinted}`;
			}
			// acorn's defect: the tokens go unread, the rest is checked.
			sameTokens = true;
		}
		if (!sameTokens) {
			return `minify ${label}: printer writes its output otherwise\n\toutput:    ${code}\n\treprinted: ${reprinted}`;
		}
		const printedTree =
			set === PRINT_ONLY && read !== undefined
				? parseAcornUnlessDefect(code, isModule, false)
				: undefined;
		if (printedTree !== undefined) {
			const difference = firstDifference(
				normalize(printedTree),
				read,
				"program"
			);
			if (difference) {
				return `printer: reads back differently at ${difference.at}: ${difference.ours} vs ${difference.acorn}\n\toutput: ${code}`;
			}
		}
		const printed = await run(code, isModule);
		if (
			printed !== expected &&
			!refusedByEngine(code, isModule) &&
			!(await foldsFunctionText(options))
		) {
			return `minify ${label}: prints differently\n\toutput: ${code}\n\texpected:\n${expected}\n\tprinted:\n${printed}`;
		}
		if (set === DEFAULTS) {
			const mapped = await minify(
				source,
				JSON.parse(JSON.stringify({ ...options, sourceMap: true }))
			);
			if (mapped.code !== code) {
				return `minify ${label}: writes otherwise with a source map\n\toutput: ${code}\n\tmapped: ${mapped.code}`;
			}
			const misfit = sourceMapMisfit(code, source, /** @type {string} */ (mapped.map));
			if (misfit !== undefined) {
				return `minify ${label}: source map ${misfit}\n\toutput: ${code}`;
			}
			const differs = interfaces
				? await interfaceDifference(
						source,
						isModule,
						options,
						code,
						/** @type {string} */ (mapped.map),
						minify
					)
				: undefined;
			if (differs !== undefined) {
				return `minify ${label}: ${differs}\n\toutput: ${code}`;
			}
		}
		if (set === STRONGEST) {
			// Minified again, what it prints is still the program's.
			const again = await write(code, options);
			const reprinted = await run(again, isModule);
			if (reprinted !== expected && !(await foldsFunctionText(options))) {
				return `minify ${label} twice: prints differently\n\toutput: ${again}\n\texpected:\n${expected}\n\tprinted:\n${reprinted}`;
			}
		}
	}
	return undefined;
};

/**
 * Why a regular expression literal is refused, or undefined where it is read.
 * @param {(code: string) => unknown} read a parser
 * @param {string} code the literal, as a script
 * @returns {string | undefined} the error's message
 */
const refusal = (read, code) => {
	try {
		read(code);
		return undefined;
	} catch (err) {
		return /** @type {Error} */ (err).message || "refused";
	}
};

/**
 * Where webpack's parser accepts or refuses a regular expression literal
 * otherwise than acorn, or V8 where acorn lags it.
 * @param {string} code the literal
 * @returns {string | undefined} the disagreement
 */
const regExpDifference = (code) => {
	const ours = refusal((text) => parseOurs(text, false), code);
	const acornRefusal = refusal((text) => parseAcorn(text, false, false), code);
	if ((ours === undefined) === (acornRefusal === undefined)) return undefined;
	const v8 = compileError(code, false);
	if ((ours === undefined) === (v8 === undefined)) return undefined;
	return ours === undefined
		? `reads it, which acorn and V8 refuse: ${v8}`
		: `refuses it, which acorn and V8 read: ${ours}`;
};

/**
 * The specifiers a source's `require("…")` calls name, read off acorn's tree:
 * a call, not optional, of `require` itself with one string.
 * @param {string} code the source
 * @returns {string[]} the specifiers, sorted
 */
const requiredSpecifiers = (code) => {
	/** @type {Set<string>} */
	const found = new Set();
	/**
	 * @param {unknown} node a node or value
	 * @returns {void}
	 */
	const walk = (node) => {
		if (Array.isArray(node)) {
			for (const item of node) walk(item);
			return;
		}
		if (node === null || typeof node !== "object") return;
		const current = /** @type {Record<string, EXPECTED_ANY>} */ (node);
		if (
			current.type === "CallExpression" &&
			!current.optional &&
			current.callee.type === "Identifier" &&
			current.callee.name === "require" &&
			current.arguments.length === 1 &&
			current.arguments[0].type === "Literal" &&
			typeof current.arguments[0].value === "string"
		) {
			found.add(current.arguments[0].value);
		}
		for (const key of Object.keys(current)) walk(current[key]);
	};
	walk(parseAcorn(code, false, false));
	return [...found].sort();
};

describe("JavaScript fuzzer", () => {
	/** @type {{ minify?: Minify, treePrinting?: { enabled: boolean } }} */
	const loaded = {};

	beforeAll(async () => {
		const { minify, modules } =
			await require("../../lib/javascript/syntax").printer.load();
		loaded.minify = minify;
		loaded.treePrinting = modules.treePrinting;
	});

	it("should write the same programs for the same seed", () => {
		const first = createProgramGenerator(1);
		const again = createProgramGenerator(1);
		const programs = [first(), first()];

		expect([again(), again()]).toEqual(programs);
		expect(createProgramGenerator(2)().code).not.toBe(programs[0].code);
	});

	for (const seed of seedsToRun()) {
		it(`should find the require calls acorn finds: seed ${seed}`, () => {
			const next = createRequireSourceGenerator(seed);
			/** @type {string[]} */
			const failures = [];
			for (let round = 0; round < REQUIRE_SOURCES_PER_SEED; round++) {
				const code = next();
				const ours = [...collectCjsRequireSpecifiers(code)].sort();
				const theirs = requiredSpecifiers(code);
				if (ours.join() !== theirs.join()) {
					failures.push(`found ${ours.join()} where acorn finds ${theirs.join()} in:\n${code}`);
				}
			}

			expect(failures).toEqual([]);
		});
	}

	for (const seed of seedsToRun()) {
		it(`should accept and refuse the regular expressions the engine does: seed ${seed}`, () => {
			const next = createRegExpGenerator(seed);
			/** @type {string[]} */
			const failures = [];
			for (let round = 0; round < REGEXPS_PER_SEED; round++) {
				const code = next();
				const difference = regExpDifference(code);
				if (difference !== undefined) failures.push(`${code}: ${difference}`);
			}

			expect(failures).toEqual([]);
		});
	}

	for (const seed of seedsToRun()) {
		it(
			`should parse, print and minify what each program means: seed ${seed}`,
			async () => {
				const minify = /** @type {Minify} */ (loaded.minify);
				const next = createProgramGenerator(seed);
				const random = createRandom(seed);
				/** @type {string[]} */
				const failures = [];
				for (let round = 1; round <= PROGRAMS_PER_SEED; round++) {
					const program = next();
					const optionSets = [
						...OPTION_SETS,
						randomOptions(random),
						randomOptions(random)
					];
					/** @type {string | undefined} */
					let failure;
					try {
						failure = await checkProgram(
							program,
							optionSets,
							minify,
							round % INTERFACE_EVERY === 1,
							/** @type {{ enabled: boolean }} */ (loaded.treePrinting)
						);
					} catch (err) {
						failure = `throws ${/** @type {Error} */ (err).stack}`;
					}
					// A failing program is the finding: the rest of the seed waits on it.
					if (failure !== undefined) {
						failures.push(
							`round ${round}${program.module ? " (module)" : ""}: ${failure}\n\tprogram:\n${program.code}`
						);
						break;
					}
				}

				expect(failures).toEqual([]);
			},
			SEED_TIMEOUT
		);
	}
});
