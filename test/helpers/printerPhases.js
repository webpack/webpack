"use strict";

// Which of the printer's phases a minifier suite installs, set by PHASES:
// `PHASES=mangle,output` for those two only, `PHASES=-parse` for all but one.
// Installed phases stay patched on terser's modules for the whole process.

const { PHASES, loadSources } = require("../../lib/javascript/syntax").printer;

/**
 * @param {string | undefined} setting the PHASES variable
 * @returns {string[]} the phases to install, in the order they install
 */
const selectPhases = (setting) => {
	const names = PHASES.map((phase) => phase.name);
	const entries = (setting || "")
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean);
	for (const entry of entries) {
		if (!names.includes(entry.replace(/^-/, ""))) {
			throw new Error(
				`Unknown phase "${entry}" in PHASES, expected one of ${names.join(", ")}`
			);
		}
	}
	const kept = entries.filter((entry) => !entry.startsWith("-"));
	const dropped = entries
		.filter((entry) => entry.startsWith("-"))
		.map((entry) => entry.slice(1));
	return names.filter(
		(name) =>
			(kept.length === 0 || kept.includes(name)) && !dropped.includes(name)
	);
};

/**
 * @param {string[]} selected the phases to install
 * @returns {Promise<{ minify: (code: string, options: import("terser").MinifyOptions) => Promise<{ code?: string }>, phases: string[], corrections: { enabled: boolean } | undefined }>} terser, the phases it took, and the switch of its corrections
 */
const loadPhases = async (selected) => {
	const modules = await loadSources();
	/** @type {string[]} */
	const phases = [];
	for (const phase of PHASES) {
		if (!selected.includes(phase.name) || !phase.supports(modules)) continue;
		phase.install(modules);
		phases.push(phase.name);
	}
	return { minify: modules.minify, phases, corrections: modules.corrections };
};

module.exports = { loadPhases, selectPhases };
