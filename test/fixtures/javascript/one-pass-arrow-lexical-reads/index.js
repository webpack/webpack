function own() {
	var read = (unused) => this;
	return read(1) === 7;
}
console.log(own.call(7));
var base = {
	name: function () {
		return "base";
	}
};
var derived = {
	__proto__: base,
	name() {
		var read = (unused) => super.name();
		return read(2) + "!";
	}
};
console.log(derived.name());
function Made() {
	var read = (unused) => new.target;
	return read(3) === Made;
}
console.log(new Made() instanceof Made, Made());
function nested() {
	var read = (unused) => this;
	function inner() {
		return read(4);
	}
	return inner.call(5);
}
console.log(nested.call(6));
