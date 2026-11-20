var object = {
	p: 1,
	nan: NaN,
	f: function (value) {
		return value * 10;
	}
};
console.log(object.p === object.p, object.nan !== object.nan, object.f === object.f, object.f(2));

var calls = 0;
var tricky = {
	get p() {
		return calls++ % 2 ? 1 : "1";
	}
};
console.log(tricky.p === tricky.p, tricky.p !== tricky.p);

var unset = undefined;
try {
	console.log(later.p === later.p);
} catch (e) {
	console.log(e.name);
}
var later = { p: 2 };
console.log(later.p === later.p, unset === unset);

function read(value) {
	return value.p === value.p;
}
console.log(read({ p: 3 }));
