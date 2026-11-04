import { value } from "./module";

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
		typeof load
	];
}
