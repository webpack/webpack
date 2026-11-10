"use strict";

const viaTemplate = require(`./cjs`).value;
const viaMerged = require(`./${"c"}js`).value;
const viaRaw = require(String.raw`./cjs`).value;
const merged = `a${"b"}c${typeof viaTemplate}d`;
const raw = String.raw`x\n${"y"}`;
const tag = (strings, ...values) => `${strings.raw.join("|")}:${values.join(",")}`;
const tagged = tag`p${merged.length}q`;

function scoped() {
	class Inner {}
	return new Inner() instanceof Inner;
}

module.exports = { viaTemplate, viaMerged, viaRaw, merged, raw, tagged, scoped: scoped() };
