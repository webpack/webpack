import { light as shadowedLight } from "shadowed-sef";
import { light as declaredLight } from "declared-nested-sef";
import { light as explicitLight } from "explicit-nested-true";
import { light as localAppLight } from "./local-app-nested/esm";
import { light as globArrayLight } from "glob-array-sef";
import { light as globStringLight } from "glob-string-sef";
import { light as stopAtNmLight } from "stop-at-node-modules";
import { light as unnamedInnerLight } from "unnamed-inner-sef";
import { light as brokenAncestorLight } from "broken-ancestor-sef";
import { light as arrayAncestorLight } from "array-ancestor-sef";
import { light as missingMidLight } from "missing-mid-sef";
import { light as namedAncestorLight } from "named-ancestor-no-sef";

const SHADOWED_HEAVY = ["HEAVY", "SHADOWED", "BY", "TYPE", "ONLY"].join("_");
const DECLARED_HEAVY = ["HEAVY", "DECLARED", "NESTED", "SEF"].join("_");
const EXPLICIT_TRUE_HEAVY = ["HEAVY", "EXPLICIT", "NESTED", "TRUE"].join("_");
const LOCAL_APP_HEAVY = ["HEAVY", "LOCAL", "APP", "NESTED"].join("_");
const GLOB_ARRAY_HEAVY = ["HEAVY", "GLOB", "ARRAY", "SEF"].join("_");
const GLOB_STRING_HEAVY = ["HEAVY", "GLOB", "STRING", "SEF"].join("_");
const STOP_AT_NM_HEAVY = ["HEAVY", "STOP", "AT", "NODE", "MODULES"].join("_");
const UNNAMED_INNER_HEAVY = ["HEAVY", "UNNAMED", "INNER"].join("_");
const BROKEN_ANCESTOR_HEAVY = ["HEAVY", "BROKEN", "ANCESTOR"].join("_");
const ARRAY_ANCESTOR_HEAVY = ["HEAVY", "ARRAY", "ANCESTOR"].join("_");
const MISSING_MID_HEAVY = ["HEAVY", "MISSING", "MID"].join("_");
const NAMED_ANCESTOR_HEAVY = ["HEAVY", "NAMED", "ANCESTOR", "NO", "SEF"].join(
	"_"
);

/**
 * @param {string} marker
 * @returns {boolean}
 */
function moduleSourceIncludes(marker) {
	return Object.keys(__webpack_modules__).some((id) =>
		String(__webpack_modules__[id]).includes(marker)
	);
}

it("still runs the used export from all fixtures", () => {
	expect(shadowedLight).toBe("light");
	expect(declaredLight).toBe("light");
	expect(explicitLight).toBe("light");
	expect(localAppLight).toBe("light");
	expect(globArrayLight).toBe("light");
	expect(globStringLight).toBe("light");
	expect(stopAtNmLight).toBe("light");
	expect(unnamedInnerLight).toBe("light");
	expect(brokenAncestorLight).toBe("light");
	expect(arrayAncestorLight).toBe("light");
	expect(missingMidLight).toBe("light");
	expect(namedAncestorLight).toBe("light");
});

it("drops unused heavy when the nested package.json also declares sideEffects: false", () => {
	expect(moduleSourceIncludes(DECLARED_HEAVY)).toBe(false);
});

it("should drop unused heavy when only the package root declares sideEffects: false", () => {
	// Root sideEffects: false; nested is type-only (entities-like).
	expect(moduleSourceIncludes(SHADOWED_HEAVY)).toBe(false);
});

it("keeps unused heavy when the nested package.json explicitly sets sideEffects: true", () => {
	expect(moduleSourceIncludes(EXPLICIT_TRUE_HEAVY)).toBe(true);
});

it("does not inherit app-root sideEffects past a local nested package.json", () => {
	expect(moduleSourceIncludes(LOCAL_APP_HEAVY)).toBe(true);
});

it("rebases relativePath when inheriting array sideEffects globs", () => {
	// Root sideEffects: ["./index.js"]; without rebase, esm/index.js looks like ./index.js.
	expect(moduleSourceIncludes(GLOB_ARRAY_HEAVY)).toBe(false);
});

it("rebases relativePath when inheriting string sideEffects globs", () => {
	expect(moduleSourceIncludes(GLOB_STRING_HEAVY)).toBe(false);
});

it("does not inherit app sideEffects across a node_modules directory", () => {
	// Package root has no name/sideEffects so walk continues; must stop at node_modules.
	expect(moduleSourceIncludes(STOP_AT_NM_HEAVY)).toBe(true);
});

it("keeps walking past an unnamed package.json deeper inside the package", () => {
	// dist/package.json names no package, so the root still speaks for dist/esm.
	expect(moduleSourceIncludes(UNNAMED_INNER_HEAVY)).toBe(false);
});

it("stops at an ancestor package.json it cannot read", () => {
	// Unparsable: what it declares is unknown, so no outer flag may speak for it.
	expect(moduleSourceIncludes(BROKEN_ANCESTOR_HEAVY)).toBe(true);
});

it("keeps walking past an ancestor package.json that declares nothing", () => {
	// It parsed, and an array declares no sideEffects — like any unnamed manifest.
	expect(moduleSourceIncludes(ARRAY_ANCESTOR_HEAVY)).toBe(false);
});

it("keeps walking past a directory that has no package.json", () => {
	expect(moduleSourceIncludes(MISSING_MID_HEAVY)).toBe(false);
});

it("stops at a named ancestor that declares no sideEffects", () => {
	// The package speaks for itself, and it said nothing.
	expect(moduleSourceIncludes(NAMED_ANCESTOR_HEAVY)).toBe(true);
});
