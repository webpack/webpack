import * as ns from "./esm.js";
import { named, nothing } from "./esm.js";

/**
 * @returns {string[]} what each guarded branch saw
 */
export function guards() {
	const seen = [];
	if (ns.named) seen.push(ns.named);
	if ("named" in ns) seen.push(`in:${ns.named}`);
	if (!("missing" in ns)) seen.push("not-in");
	else seen.push(`else:${ns.named}`);
	if ("named" in ns && ns.named) seen.push(`in-and:${named}`);
	if (nothing || "named" in ns) seen.push(`or:${ns.named}`);
	if (nothing ?? "named" in ns) seen.push(`nullish:${ns.named}`);
	seen.push(named ? `ternary:${named}` : "none");
	seen.push(named && `and:${named}`);
	// each reads a missing export only where a presence check proves it there
	if ("missing" in ns && named) seen.push(ns.missing);
	if (false || "missing" in ns) seen.push(ns.missing);
	if ("missing" in ns || false) seen.push(ns.missing);
	if (null ?? "missing" in ns) seen.push(ns.missing);
	if ("missing" in ns ?? named) seen.push(ns.missing);
	if (!("missing" in ns)) seen.push("absent");
	else seen.push(ns.missing);
	return seen;
}
