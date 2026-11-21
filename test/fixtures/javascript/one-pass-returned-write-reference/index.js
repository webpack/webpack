function member(x) {
	let seen;
	return (seen = x.y), seen;
}
console.log(member({ y: 1 }), member({ y: 2 }));
var accessor = {
	get p() {
		console.log("get");
		return 3;
	},
	m: function () {}
};
function getter(o) {
	var seen;
	return (seen = o.p), seen;
}
console.log(getter(accessor), getter(accessor));
function method(o) {
	var seen;
	return (seen = o.m), seen;
}
console.log(typeof method(accessor), typeof method(accessor));
function closure(x) {
	var seen;
	function read() {
		return seen;
	}
	var value = (function () {
		return (seen = x.y), seen;
	})();
	return [value, read()];
}
console.log(closure({ y: 4 }), closure({ y: 5 }));
function finished(x) {
	var seen;
	try {
		return (seen = x.y), seen;
	} finally {
		console.log("finally", seen);
	}
}
console.log(finished({ y: 6 }), finished({ y: 7 }));
