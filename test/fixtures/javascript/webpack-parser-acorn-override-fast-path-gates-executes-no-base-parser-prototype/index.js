#!/usr/bin/env node
import def, { a as b } from 'm'; import * as ns from 'n';
export const answer = 42; export default class Widget extends ns.Base {
	static #count = 0; #label; static { Widget.#count = 0; }
	constructor() { super(); this.#label = `w${Widget.#count++}`; }
	get label() { return this.#label; } async *walk([x = 1, ...rest] = []) {
		lab: for (const item of rest) { if (item ?? x) { yield (await item) ** 2; continue lab; } }
	}
}
export { answer as 'the answer' } ;
async function main() { const res = await ns.open?.(); do main(res); while (false); }
let { p, q: [r = /re?g/gu] = [] } = ns, s = 0b101 + 1_000n;
debugger;
await ns.ready;