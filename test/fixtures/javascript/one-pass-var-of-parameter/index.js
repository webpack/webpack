function counts(value, callback) {
	var value = 0;
	callback && callback(value);
	return value++;
}
console.log(counts());

function branches(value) {
	if (value > 0) var value = value * 2;
	else var value = -value;
	return value;
}
console.log(branches(2), branches(-3));

function defaults(value, read = () => value) {
	var value = 2;
	return [value, read()].join();
}
console.log(defaults(1));

function mapped(value) {
	var value = 2;
	return arguments[0];
}
console.log(mapped(1));

function blocks(value) {
	var other = value + 1;
	{
		var value = other * 2;
		var last = value;
	}
	return [value, other, last].join();
}
console.log(blocks(1));
