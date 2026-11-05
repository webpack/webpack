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
	{
		let b0 = 0;
		let b1 = 1;
		let b2 = 2;
		let b3 = 3;
		let b4 = 4;
		let b5 = 5;
		let b6 = 6;
		let b7 = 7;
		let b8 = 8;
		let b9 = 9;
		let b10 = 10;
		let b11 = 11;
		let b12 = 12;
		let b13 = 13;
		let b14 = 14;
		let b15 = 15;
		let b16 = 16;
		let b17 = 17;
		let b18 = 18;
		let b19 = 19;
		let b20 = 20;
		let b21 = 21;
		let b22 = 22;
		let b23 = 23;
		let b24 = 24;
		let b25 = 25;
		let b26 = 26;
		let b27 = 27;
		let b28 = 28;
		let b29 = 29;
		let b30 = 30;
		let b31 = 31;
		let b32 = 32;
		out.push(b0 + b32);
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
