"use strict";

// Records every source a test hands a syntax `SourceProcessor`, so the
// comparison sweeps can hold the parser and printer to their invariants over the
// unit tests' own inputs. Active only when `RECORD_SYNTAX_INPUTS` names a file.

const fs = require("fs");
const SourceProcessor = require("../../lib/util/SourceProcessor");

const file = process.env.RECORD_SYNTAX_INPUTS;

if (file) {
	/** @type {Map<string, Set<string>>} */
	const seen = new Map();
	const { process: run } = SourceProcessor.prototype;
	SourceProcessor.prototype.process =
		/** @type {typeof run} */
		(
			function process(input, options) {
				const language = this.constructor.name;
				if (typeof input === "string") {
					let sources = seen.get(language);
					if (sources === undefined) {
						sources = new Set();
						seen.set(language, sources);
					}
					sources.add(input);
				}
				return run.call(this, input, options);
			}
		);
	afterAll(() => {
		let lines = "";
		for (const [language, sources] of seen) {
			for (const source of sources) {
				lines += `${JSON.stringify({ language, source })}\n`;
			}
		}
		fs.appendFileSync(file, lines);
	});
}
