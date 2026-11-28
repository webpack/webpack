// A label whose body went labels nothing, though an outer label's `break` went.
function nested(list) {
	outer: inner: break outer;
	first: {
		second: {
			list.push("block");
			break first;
		}
	}
	return list;
}
// As a loop's body, it prints as an empty statement.
function body(list) {
	let count = 0;
	while (count++ < 2) step: {
		break step;
	}
	for (const item of list) skip: {
		break skip;
	}
	return count;
}
// A `break` running on past the label keeps it.
function kept(list) {
	outer: {
		inner: {
			if (list.length) break outer;
			list.push("inner");
		}
		console.log(list.length);
	}
	return list;
}
console.log(nested([]), body([1, 2]), kept([]), kept([0]));
