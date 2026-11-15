var b = 1, o = { c: 0 };
function a() {
	console.log("a");
}
(a(), b) ? console.log(1) : console.log(2);
(a(), o.c) + b ? console.log(3) : console.log(4);
((a(), b) ? o : null) ? console.log(5) : console.log(6);
