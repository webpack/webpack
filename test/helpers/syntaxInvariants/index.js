/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { idempotence, purityRelation } = require("./relations");

/** @typedef {import("./relations").Report} Report */

/**
 * One preset's printer for one source.
 * @typedef {object} InvariantPrinter
 * @property {string} name the preset
 * @property {(source: string) => string} minify prints the source
 * @property {((printed: string) => string)=} reprint prints its output again, where a second minify would change it
 * @property {(text: string) => string} says what a text says, as a digest
 * @property {((printed: string, at: number) => { source: string, again: string } | null)=} repro cuts an idempotence difference down
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
 * purity for the parser; idempotence, respelling and cut inputs for the printer.
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
	 * @param {string} label the source
	 * @param {string} source its text
	 * @returns {{ name: string, printed: string | null }[]} each preset's output
	 */
	const print = (label, source) =>
		syntax.printers(source).map((printer) => {
			const { printed, reports } = idempotence({ ...printer, source });
			add(label, printer.name, reports);
			return { name: printer.name, printed };
		});
	for (const [label, source] of sources) {
		add(label, "parse", syntax.spans(source));
		add(label, "parse", syntax.slices(source));
		const [first] = syntax.printers(source);
		const [printed] = print(label, source);
		// One preset is enough: whether a spelling decides the output is the same
		// question under every option set.
		if (first !== undefined && printed.printed !== null) {
			add(
				label,
				first.name,
				syntax.respellings(first, source, printed.printed)
			);
		}
		for (const [where, cut] of syntax.cuts(source)) {
			print(`${label}, cut ${where}`, cut);
		}
	}
	const { reports } = purityRelation(
		sources.map(([label, source]) => ({
			what: label,
			digest: () => syntax.digest(source)
		}))
	);
	for (const report of reports) findings.push({ label: report.repro.trim(), preset: "parse", report });
	return findings;
};

module.exports = { invariantFindings };
