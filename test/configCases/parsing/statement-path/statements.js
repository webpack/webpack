import { value } from "./module";

export function walk(input) {
	var key;
	var out = [];
	if (value) {
		out.push("import");
	} else {
		out.push("no import");
	}
	if (input > 2) {
		out.push("big");
	} else {
		out.push("small");
	}
	if (false) {
		out.push("never");
	} else {
		out.push("constant");
	}
	for (key in { a: 1 }) out.push(key);
	for (key = 0; key < 1; key++) out.push(key);
	try {
		try {
			out.push("try");
		} catch (error) {
			out.push(error);
		}
	} finally {
		out.push("finally");
	}
	skipped: {
		out.push("skipped");
	}
	out.push(either(input));
	return out;
}

function either(input) {
	if (input) {
		return "yes";
	} else {
		return "no";
	}
	out.push("dead");
}
