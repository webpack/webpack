function f(NaN) {
	var a = +"foo",
		b = x / +"foo";
	console.log(a, b, (+"foo").toFixed(), NaN);
}
var x = 2;
f(1);
