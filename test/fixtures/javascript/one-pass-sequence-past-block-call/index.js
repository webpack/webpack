function ends(n) {
	(function (m) {
		var v = m + 1;
		console.log("ends", v);
	})(n);
	console.log("after");
}
function opens(n) {
	console.log("before");
	(function (m) {
		console.log("opens", m);
		var v = m + 1;
		console.log(v);
	})(n);
}
function both(n) {
	console.log("before");
	(function (m) {
		console.log("first", m);
		var v = m * 2;
		console.log("last", v);
	})(n);
	console.log("after");
}
function guarded(n) {
	(function (m) {
		var v = m + 1;
		if (v > 2) return;
		console.log("small", v);
	})(n);
	console.log("after");
}
function block(n) {
	console.log("before");
	{
		console.log("in", n);
		var w = n + 2;
		console.log(w);
	}
	console.log("after");
}
block(1);
block(2);
ends(1);
ends(2);
opens(1);
opens(2);
both(3);
both(4);
guarded(1);
guarded(5);
