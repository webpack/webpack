/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const path = require("path");
const {
	INVARIANT_BUDGET,
	OVERFLOW,
	isStackOverflow,
	unexplained,
	unlessOverflow
} = require("../fixture");
const {
	blockCounter,
	idempotence,
	purityRelation,
	scalingRelation
} = require("./relations");

/** @typedef {import("../fixture").FixtureEntry} FixtureEntry */
/** @typedef {import("./relations").Report} Report */

/**
 * One preset's printer for one source.
 * @typedef {object} InvariantPrinter
 * @property {string} name the preset
 * @property {(source: string) => string} minify prints the source
 * @property {((printed: string) => string)=} reprint prints its output again, where a second minify would change it
 * @property {(text: string) => string} says what a text says, as a digest
 * @property {((printed: string, at: number) => { source: string, again: string } | null)=} repro cuts an idempotence difference down
 * @property {((source: string, printed: string) => Report[])=} keeps what the output fails to keep of a whole source: its meaning, its legal notices, what it does when run
 */

/**
 * What one syntax answers each relation with.
 * @typedef {object} SyntaxInvariants
 * @property {(source: string) => InvariantPrinter[]} printers each preset's printer, none where the source does not parse
 * @property {(source: string) => Report[] | null} spans what its ranges break, null where it does not parse
 * @property {(source: string) => Report[] | null} slices what its nodes' own bytes parse to apart, null where it does not parse
 * @property {(source: string) => string} digest what one reading of it derives, for purity
 * @property {(printer: InvariantPrinter, source: string, printed: string) => Report[]} respellings what a respelling moves in the output
 * @property {(source: string) => [string, string][]} cuts `[where, cut]` for each place it is cut short inside a construct
 */

/**
 * One finding, with where it was found.
 * @typedef {{ label: string, preset: string, report: Report }} InvariantFinding
 */

/**
 * Every relation one syntax breaks over a set of sources: spans, slices and
 * purity for the parser; idempotence, what each preset keeps, respelling and
 * cut inputs for the printer, a cut's spans and slices reported as `cut spans`
 * and `cut slices`. A source past `INVARIANT_BUDGET` skips the cuts,
 * slices, respellings, per-source purity and all presets but the first; one
 * deeper than the stack, every relation.
 * @param {SyntaxInvariants} syntax the syntax's answers
 * @param {readonly [string, string][]} sources `[label, source]` pairs
 * @returns {InvariantFinding[]} what broke
 */
const invariantFindings = (syntax, sources) => {
	/** @type {InvariantFinding[]} */
	const findings = [];
	/**
	 * @param {string} label the source
	 * @param {string} preset the preset, or `parse`
	 * @param {Report[] | null} reports what broke
	 * @returns {void}
	 */
	const add = (label, preset, reports) => {
		if (reports === null) return;
		for (const report of reports) findings.push({ label, preset, report });
	};
	/**
	 * @param {string} label the cut source
	 * @param {Report[] | null} reports what its parse broke
	 * @returns {void}
	 */
	const addCut = (label, reports) => {
		if (reports === null) return;
		for (const report of reports) {
			const relation = `cut ${report.relation}`;
			findings.push({ label, preset: "parse", report: { ...report, relation } });
		}
	};
	/**
	 * @param {string} label the source
	 * @param {string} source its text
	 * @param {number=} presets how many of the presets to print it under, all where absent
	 * @returns {{ printer: InvariantPrinter, printed: string | null }[]} each preset's output
	 */
	const print = (label, source, presets = Infinity) =>
		syntax.printers(source).slice(0, presets).map((printer) => {
			/** @type {unknown} */
			let overflow;
			/**
			 * @param {(text: string) => string} read a print
			 * @returns {(text: string) => string} it, noting where it runs out of stack
			 */
			const noting = (read) => (text) => {
				try {
					return read(text);
				} catch (err) {
					if (isStackOverflow(err)) overflow = err;
					throw err;
				}
			};
			const { printed, reports } = idempotence({
				...printer,
				minify: noting(printer.minify),
				reprint: noting(printer.reprint || printer.minify),
				source
			});
			// Not a finding: `unlessOverflow` drops the source's relations.
			if (overflow !== undefined) throw overflow;
			add(label, printer.name, reports);
			return { printer, printed };
		});
	for (const [label, source] of sources) {
		const large = source.length > INVARIANT_BUDGET;
		const before = findings.length;
		const held = unlessOverflow(() => {
			add(label, "parse", syntax.spans(source));
			if (!large) add(label, "parse", syntax.slices(source));
			const outputs = print(label, source, large ? 1 : Infinity);
			for (const { printer, printed } of outputs) {
				if (printer.keeps !== undefined && printed !== null) {
					add(label, printer.name, printer.keeps(source, printed));
				}
			}
			if (large) return true;
			// One preset is enough: whether a spelling decides the output is the same
			// question under every option set.
			if (outputs.length > 0 && outputs[0].printed !== null) {
				add(
					label,
					outputs[0].printer.name,
					syntax.respellings(outputs[0].printer, source, outputs[0].printed)
				);
			}
			for (const [where, cut] of syntax.cuts(source)) {
				const at = `${label}, cut ${where}`;
				addCut(at, syntax.spans(cut));
				addCut(at, syntax.slices(cut));
				print(at, cut);
			}
			return true;
		});
		// A source deeper than the stack answers no relation, not part of one.
		if (held === OVERFLOW) findings.length = before;
	}
	// A large source is held to purity among all the others, by each runner.
	const { reports } = purityRelation(
		sources
			.filter(([, source]) => source.length <= INVARIANT_BUDGET)
			.map(([label, source]) => ({
				what: label,
				digest: () => unlessOverflow(() => syntax.digest(source))
			}))
	);
	for (const report of reports) findings.push({ label: report.repro.trim(), preset: "parse", report });
	return findings;
};

/** The scripts whose blocks the scaling relation counts. */
const LIB = path.join(__dirname, "..", "..", "..", "lib");

// Large enough that a block looping over the input outgrows the constant work
// around it: the CSS fixtures before #23377 grow 3.9-12.6× here, 2.0× after.
const SCALING_SIZE = 64;

/**
 * How the work of minifying each source under its first preset grows with its
 * size: each is built at `SCALING_SIZE` and twice that, and every block of
 * `lib/` entered more than three times as often for the larger is a finding.
 * The work is counted, not timed, so it answers alike on every machine.
 * @param {() => SyntaxInvariants} load loads the syntax afresh, as only code compiled once counting has started is counted
 * @param {readonly [string, (n?: number) => string][]} sources `[label, build]` pairs, `build()` giving the source at its own size
 * @returns {InvariantFinding[] | null} what grew faster than its input, null where the runtime cannot count
 */
const scalingFindings = (load, sources) => {
	if (sources.length === 0) return [];
	const counter = blockCounter(LIB);
	if (counter === null) return null;
	/** @type {InvariantFinding[]} */
	const findings = [];
	try {
		const syntax = load();
		for (const [label, build] of sources) {
			// The source at its own size first, so what the first use of the
			// printer sets up lands in no count.
			const warm = build();
			const [first] = syntax.printers(warm);
			if (first === undefined) continue;
			first.minify(warm);
			const reports = scalingRelation((size) => {
				const source = build(size);
				const [printer] = syntax.printers(source);
				return counter.count(() => printer.minify(source));
			}, SCALING_SIZE);
			for (const report of reports) {
				findings.push({ label, preset: first.name, report });
			}
		}
	} finally {
		counter.stop();
	}
	return findings;
};

/**
 * What `scalingFindings` leaves unexplained over the fixtures whose
 * `fixture.js` builds the input at a size, each line led by the fixture's name.
 * @param {() => SyntaxInvariants} load loads the syntax afresh
 * @param {readonly FixtureEntry[]} entries a runner's fixtures
 * @returns {string[] | null} each finding no `scaling` entry names and each such entry gone stale, null where the runtime cannot count
 */
const unexplainedScaling = (load, entries) => {
	/** @type {[string, (n?: number) => string][]} */
	const sources = [];
	for (const { name, sized } of entries) {
		if (sized !== undefined) sources.push([name, sized]);
	}
	const findings = scalingFindings(load, sources);
	if (findings === null) return null;
	/** @type {string[]} */
	const left = [];
	for (const { name, sized, source, expectedScaling } of entries) {
		if (sized === undefined) continue;
		const own = findings.filter(({ label }) => label === name);
		for (const line of unexplained(own, expectedScaling, source)) {
			left.push(`${name}: ${line}`);
		}
	}
	return left;
};

module.exports = { invariantFindings, scalingFindings, unexplainedScaling };
