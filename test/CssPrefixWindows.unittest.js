"use strict";

/** @typedef {{ version_added?: string | boolean | null, version_removed?: string | boolean | null, prefix?: string, alternative_name?: string, flags?: EXPECTED_ANY[] }} BcdSupport */
/** @typedef {{ __compat?: { support: { [browser: string]: BcdSupport | BcdSupport[] } } }} BcdNode */

const bcd =
	/** @type {{ css: { properties: { [name: string]: BcdNode } } }} */ (
		/** @type {unknown} */ (require("@mdn/browser-compat-data"))
	);
const { PREFIXED_PROPERTIES, PREFIX_BROWSERS } = require("../lib/css/data");

/**
 * The browserslist name each BCD key folds onto, for the browsers the prefix
 * tables carry windows for.
 * @type {Map<string, string[]>}
 */
const BCD_TO_BROWSERSLIST = new Map([
	["chrome", ["chrome"]],
	["chrome_android", ["and_chr"]],
	["edge", ["edge"]],
	["firefox", ["firefox"]],
	["firefox_android", ["and_ff"]],
	["ie", ["ie", "ie_mob"]],
	["opera", ["opera"]],
	["opera_android", ["op_mob"]],
	["safari", ["safari"]],
	["safari_ios", ["ios_saf"]],
	["samsunginternet_android", ["samsung"]],
	["webview_android", ["android"]]
]);

// The one browser whose engine change took its unprefixed support away again:
// Presto 12.1 shipped these unprefixed, then Opera 15 became Chromium 28 and
// needed `-webkit-`. Nothing in BCD marks the discontinuity.
const ENGINE_SWITCHES = new Map([
	["opera", { at: 15, before: "-o-", after: "-webkit-" }]
]);

/**
 * @param {string | boolean | null | undefined} version a BCD version
 * @returns {number | null} it as a number, or `null` when it says nothing
 */
const versionOf = (version) => {
	if (version === true) return 0;
	if (typeof version !== "string") return null;
	const parsed = Number.parseFloat(version.replace(/^≤/, ""));
	return Number.isNaN(parsed) ? null : parsed;
};

/**
 * The generator keeps a prefixed spelling only while it precedes the unprefixed
 * one. This re-runs that decision to collect what it discarded, so a window the
 * shipped table is missing is visible rather than silent.
 * @returns {{ engineSwitch: string[], sameVersion: number, foreignAlias: number }} what the shipped tables omit, by cause
 */
const discardedWindows = () => {
	/** @type {string[]} */
	const engineSwitch = [];
	let sameVersion = 0;
	let foreignAlias = 0;

	for (const [property, spellings] of PREFIXED_PROPERTIES) {
		const compat = bcd.css.properties[property];
		if (compat === undefined || compat.__compat === undefined) continue;
		/** @type {Map<string, Set<string>>} */
		const shipped = new Map();
		for (const [spelling, windows] of spellings) {
			shipped.set(spelling, new Set(windows.map(([browser]) => browser)));
		}

		for (const [key, raw] of Object.entries(compat.__compat.support)) {
			const browsers = BCD_TO_BROWSERSLIST.get(key);
			if (browsers === undefined) continue;
			const entries = Array.isArray(raw) ? raw : [raw];

			let unprefixedFrom = null;
			for (const entry of entries) {
				if (
					!entry ||
					entry.prefix ||
					entry.alternative_name ||
					entry.version_removed ||
					entry.flags
				) {
					continue;
				}
				const added = versionOf(entry.version_added);
				if (
					added !== null &&
					(unprefixedFrom === null || added < unprefixedFrom)
				) {
					unprefixedFrom = added;
				}
			}
			if (unprefixedFrom === null) continue;

			for (const entry of entries) {
				if (!entry || entry.flags || !entry.prefix) continue;
				const prefixedFrom = versionOf(entry.version_added);
				if (prefixedFrom === null || prefixedFrom < unprefixedFrom) continue;
				const spelling = entry.prefix + property;

				for (const browser of browsers) {
					const windows = shipped.get(spelling);
					if (windows !== undefined && windows.has(browser)) continue;
					const change = ENGINE_SWITCHES.get(browser);
					if (prefixedFrom === unprefixedFrom) {
						// BCD records one version for both spellings, so which the
						// engine actually needed is not recoverable from it.
						sameVersion++;
					} else if (
						change !== undefined &&
						unprefixedFrom < change.at &&
						prefixedFrom >= change.at &&
						entry.prefix === change.after
					) {
						engineSwitch.push(
							`${spelling} @ ${browser} (unprefixed ${unprefixedFrom}, prefixed again ${prefixedFrom})`
						);
					} else {
						// A prefix that was never this browser's own, adopted late for
						// web compatibility — Firefox reads `-webkit-` spellings it
						// never needed. Dropping those is right.
						foreignAlias++;
					}
				}
			}
		}
	}

	engineSwitch.sort();
	return { engineSwitch, sameVersion, foreignAlias };
};

describe("CSS prefix windows", () => {
	const discarded = discardedWindows();

	it("maps every browser the prefix tables carry windows for", () => {
		const mapped = new Set();
		for (const names of BCD_TO_BROWSERSLIST.values()) {
			for (const name of names) mapped.add(name);
		}
		for (const browser of PREFIX_BROWSERS) {
			expect(mapped.has(browser)).toBe(true);
		}
	});

	// Opera 15/16 read `-webkit-`, so a target of those versions is served only
	// the unprefixed spelling it cannot use. Narrow enough to leave, listed here
	// so it is a decision rather than an oversight — and so closing it, or a
	// second browser joining it, fails this test instead of passing unseen.
	it("has one known gap, and it is Opera's engine change", () => {
		expect(discarded.engineSwitch).toEqual([
			"-webkit-background-clip @ opera (unprefixed 10.5, prefixed again 15)",
			"-webkit-background-origin @ opera (unprefixed 10.5, prefixed again 15)",
			"-webkit-background-size @ opera (unprefixed 10, prefixed again 15)",
			"-webkit-border-bottom-left-radius @ opera (unprefixed 10.5, prefixed again 15)",
			"-webkit-border-bottom-right-radius @ opera (unprefixed 10.5, prefixed again 15)",
			"-webkit-border-top-left-radius @ opera (unprefixed 10.5, prefixed again 15)",
			"-webkit-border-top-right-radius @ opera (unprefixed 10.5, prefixed again 15)",
			"-webkit-column-rule @ opera (unprefixed 11.1, prefixed again 15)",
			"-webkit-column-rule-color @ opera (unprefixed 11.1, prefixed again 15)",
			"-webkit-column-rule-style @ opera (unprefixed 11.1, prefixed again 15)",
			"-webkit-column-rule-width @ opera (unprefixed 11.1, prefixed again 15)",
			"-webkit-column-width @ opera (unprefixed 11.1, prefixed again 15)",
			"-webkit-flex-basis @ opera (unprefixed 12.1, prefixed again 15)",
			"-webkit-flex-direction @ opera (unprefixed 12.1, prefixed again 15)",
			"-webkit-flex-flow @ opera (unprefixed 12.1, prefixed again 15)",
			"-webkit-flex-grow @ opera (unprefixed 12.1, prefixed again 15)",
			"-webkit-flex-shrink @ opera (unprefixed 12.1, prefixed again 15)",
			"-webkit-transition @ opera (unprefixed 12.1, prefixed again 15)",
			"-webkit-transition-delay @ opera (unprefixed 12.1, prefixed again 15)",
			"-webkit-transition-duration @ opera (unprefixed 12.1, prefixed again 15)",
			"-webkit-transition-property @ opera (unprefixed 12.1, prefixed again 15)",
			"-webkit-transition-timing-function @ opera (unprefixed 12.1, prefixed again 15)"
		]);
	});

	it("discards the rest for a reason that is not an engine change", () => {
		expect(discarded.sameVersion).toBeGreaterThan(0);
		expect(discarded.foreignAlias).toBeGreaterThan(0);
	});
});
