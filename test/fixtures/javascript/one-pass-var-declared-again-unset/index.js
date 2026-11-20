// A `var` each declaration of which sets nothing is `undefined` wherever it is read.
function unset(list) {
	var found;
	for (var key in list) {
		var found;
		return key + list[key];
	}
	found && found.NaN;
	return "none";
}
console.log(unset({ a: 1 }), unset({}));
function looped(list) {
	var found;
	for (var found in list);
	return found && found.length;
}
console.log(looped({ ab: 1 }), looped({}));
function set(value) {
	var found;
	var found = value;
	return found && found.length;
}
console.log(set("abc"), set(""));
function written(value) {
	var found;
	if (value) found = value;
	var found;
	return found ? found.length : -1;
}
console.log(written("ab"), written(0));
