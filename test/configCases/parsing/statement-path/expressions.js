import { value } from "./module";
import * as mod from "./module";

const tag = (strings, ...values) => strings.join("|") + values.join("|");

function* gen() {
	yield value;
}

export function expressions(input) {
	var load = require;
	var key = "k";
	var rest = { b: 2 };
	var count = 0;
	count++, count++;
	var both = (count, count + 1);
	var never = false && input;
	var always = true || input;
	var and = input && value;
	var or = input || value;
	var template = `t${value}`;
	var tagged = tag`x${value}y`;
	var spread = [...[value]];
	var guarded = value ? "guarded" : "not";
	var size = input > 2 ? "big" : "small";
	var constant = false ? "never" : "constant";
	var truthy = 1 ? "one" : "zero";
	var object = { [key]: 1, value, ...rest };
	var called = function (a) {
		return this.k + a;
	}.call({ k: 1 }, 1);
	var arrowed = ((b) => b + 1)(1);
	var fns = { k: () => 3 };
	var computed = fns[key]();
	var cache = require.cache.missing;
	var list = [7];
	var regExpKeyed = { "/x/": 8 };
	var byString = fns["k"]();
	var byNumber = list[0];
	var byRegExp = regExpKeyed[/x/];
	var byTemplate = fns[`k`]();
	var byComputed = list[input - 1];
	var destructured = (function ({ a }) {
		return a;
	})({ a: 4 });
	var applied = function (x) {
		return x;
	}.apply(null, [5]);
	var doubled = mod.double(3);
	var asm = (function () {
		"use asm";
		return "asm";
	})();
	return [
		never,
		always,
		and,
		or,
		template,
		tagged,
		spread.length,
		guarded,
		size,
		constant,
		truthy,
		Object.keys(object).join(","),
		gen().next().value,
		count,
		both,
		typeof load,
		called,
		arrowed,
		computed,
		cache,
		byString,
		byNumber,
		byRegExp,
		byTemplate,
		byComputed,
		destructured,
		applied,
		doubled,
		asm
	];
}
