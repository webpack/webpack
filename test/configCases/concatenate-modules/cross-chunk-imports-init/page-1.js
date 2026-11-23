import "./local-1.js";
import {
	early,
	hoisted,
	count,
	increment,
	Point,
	a,
	c,
	index,
	total,
	nested,
	key,
	separated,
	unset
} from "./shared/declarations.js";
import Default from "./shared/default.js";
import expression from "./shared/expression.js";
import { both } from "./shared/cycle-a.js";
import { viaA } from "./shared/cycle-b.js";
import { pair } from "./shared/pure.js";

globalThis.crossChunkInitEffects.push("page-1");

export const run = () => {
	increment();
	return {
		early,
		hoisted: hoisted(),
		count,
		point: new Point(2).double.x,
		a,
		c,
		index,
		total,
		nested,
		key,
		separated,
		unset,
		name: new Default().name(),
		expression,
		both: both(),
		viaA,
		pair
	};
};
