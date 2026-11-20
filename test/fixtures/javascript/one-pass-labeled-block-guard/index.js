// An `if` leaving a labeled block by its `break` guards the rest of the block.
function guard(flag) {
	var out = [];
	done: {
		out.push("start");
		if (flag) break done;
		out.push("rest");
		out.push("end");
	}
	return out.join(",");
}
console.log(guard(true), guard(false));
function twice(a, b) {
	var out = [];
	done: {
		if (a) break done;
		out.push("a");
		if (b) break done;
		out.push("b");
	}
	return out.join(",");
}
console.log(twice(false, false), twice(false, true), twice(true, false));
function nested(a, b) {
	var out = [];
	done: {
		if (a) break done;
		for (var i = 0; i < 3; i++) {
			if (b && i === 1) break done;
			out.push(i);
		}
		out.push("after");
	}
	return out.join(",");
}
console.log(nested(false, false), nested(false, true), nested(true, true));
function quoted(a) {
	var out = [];
	done: {
		if (a) break done;
		out.push("break done");
		out.x = {};
	}
	return out.join(",");
}
console.log(quoted(false), quoted(true));
