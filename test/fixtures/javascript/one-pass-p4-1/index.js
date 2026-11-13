function make(name) {
	return function (value) {
		console.log(name, value);
		return value;
	};
}
function joins(require) {
	var first = require(1);
	/* a comment keeps the declarations apart until they print */
	var second = first(2), unread = first(3);
	var third = first(4);
	return [second, second, third, third];
}
console.log(joins(make("joins")));
function opensApart(require) {
	var first = require(1);
	/* a comment keeps the declarations apart until they print */
	var unread = first(2), second = first(3);
	return [second, second];
}
console.log(opensApart(make("opensApart")));
function opensNew(require) {
	var first = require(1);
	/* a comment keeps the declarations apart until they print */
	var unread = new first(2), [second] = [first(3)];
	return [second, second];
}
console.log(opensNew(make("opensNew")));
function lets(require) {
	let first = require(1);
	/* a comment keeps the declarations apart until they print */
	let second = first(2), unread = first(3);
	return [second, second];
}
console.log(lets(make("lets")));
