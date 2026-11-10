import * as esm from "./esm";
import { box } from "./box";

const { double: twice } = esm;
const { value, extra = 1, ["lit"]: lit, 0: zero } = require("./cjs");
let assigned;
({ value: assigned } = require("./cjs"));
let inner;
const { value: outer } = ({ value: inner } = require("./cjs"));
const { [String(Math.random())]: unknown } = {};
const { value: rest, ...others } = require("./cjs");
const [first, , third, ...tail] = [1, 2, 3, 4];
const [[deep], { shallow }] = [[5], { shallow: 6 }];

const params = (
	{ a, b: [c = 2] = [], ["k" + 1]: d = a, ...more },
	[e, , ...f] = [],
	g = 3
) => [a, c, d, more, e, f, g];
const named = function self({ y = 1 }, z) {
	return [y, z, typeof self];
};

class Local {}
box.value = 7;

async function awaited() {
	const { value: later } = await require("./cjs");
	return later;
}

export {
	twice,
	value,
	extra,
	lit,
	zero,
	assigned,
	inner,
	outer,
	unknown,
	rest,
	others,
	first,
	third,
	tail,
	deep,
	shallow,
	Local,
	params,
	named,
	awaited
};
