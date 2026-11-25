"use strict";

const { createRandom } = require("../helpers/jsFuzzProgram");
const { invariantFindings } = require("../helpers/syntaxInvariants");
const xmlInvariants = require("../helpers/syntaxInvariants/xml");
const { createXmlDocumentGenerator } = require("../helpers/xmlFuzzDocument");

const SEEDS = process.env.XML_FUZZ_SEED
	? [
			process.env.XML_FUZZ_SEED === "random"
				? Math.floor(Math.random() * 2 ** 31)
				: Number(process.env.XML_FUZZ_SEED)
		]
	: [1, 2, 3, 4, 5, 6, 7, 8];
/**
 * @param {string | undefined} raw what `XML_FUZZ_INPUTS` is set to
 * @returns {number} the generated inputs per seed
 */
const inputsPerSeed = (raw) => {
	if (raw === undefined || raw === "") return 120;
	const count = Number(raw);
	if (!Number.isSafeInteger(count) || count < 1) {
		throw new Error(`XML_FUZZ_INPUTS must be a positive integer, not ${raw}`);
	}
	return count;
};
const INPUTS_PER_SEED = inputsPerSeed(process.env.XML_FUZZ_INPUTS);
const CHECK_IDEMPOTENCE = process.env.XML_FUZZ_CHECK_IDEMPOTENCE !== "0";
const SEED_TIMEOUT = 300000;

/**
 * @param {import("../helpers/syntaxInvariants").InvariantFinding} finding one finding
 * @param {Map<string, string>} sources its source by label
 * @returns {string} one failure line
 */
const formatFinding = (finding, sources) => {
	const source = sources.get(finding.label) || "";
	return [
		`${finding.label} [${finding.preset}] ${finding.report.relation}`,
		finding.report.what,
		finding.report.repro,
		JSON.stringify(source)
	].join("\n");
};

describe("XML fuzzer", () => {
	it("should write the same documents for the same seed", () => {
		const first = createXmlDocumentGenerator(1, createRandom);
		const again = createXmlDocumentGenerator(1, createRandom);
		const documents = [first(), first()];

		expect([again(), again()]).toEqual(documents);
		expect(createXmlDocumentGenerator(2, createRandom)()).not.toBe(
			documents[0]
		);
	});

	for (const seed of SEEDS) {
		it(
			`should hold parse and print invariants over generated xml: seed ${seed}`,
			() => {
				const next = createXmlDocumentGenerator(seed, createRandom);
				/** @type {Map<string, string>} */
				const sources = new Map();
				/** @type {[string, string][]} */
				const entries = [];
				for (let round = 1; round <= INPUTS_PER_SEED; round++) {
					const source = next();
					const label = `seed ${seed}/${round}`;
					sources.set(label, source);
					entries.push([label, source]);
				}
				const findings = invariantFindings(xmlInvariants, entries);
				const actionable = findings.filter(
					(one) => CHECK_IDEMPOTENCE || one.report.relation !== "idempotence"
				);
				expect(
					actionable.slice(0, 3).map((one) => formatFinding(one, sources))
				).toEqual([]);
			},
			SEED_TIMEOUT
		);
	}
});
