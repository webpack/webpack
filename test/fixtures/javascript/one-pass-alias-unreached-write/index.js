function alias() {
	const stable = 1;
	let copy = stable;
	if (false) copy = 2;
	return copy;
}
function update() {
	const stable = 1;
	let copy = stable;
	if (false) copy++;
	return copy;
}
function chain() {
	const stable = 1;
	let first = stable,
		second = first;
	if (false) {
		first = 2;
		second = 3;
	}
	return first + second;
}
function nested() {
	const stable = 1;
	let copy = stable;
	return function () {
		if (false) copy = 5;
		return copy;
	};
}
function forIn() {
	const stable = 1;
	let copy = stable;
	if (false) for (copy in { q: 1 });
	return copy;
}
console.log(alias(), update(), chain(), nested()(), forIn());
