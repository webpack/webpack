function first() {
	console.log("first");
}
function second() {
	console.log("second");
}
function third() {
	console.log("third");
}
if ((first(), 1)) console.log("then");
if ((second(), 1) || x) console.log("then");
if ((third(), 0)) console.log("then");
else console.log("else");
function fourth() {
	foo();
}
function foo() {
	console.log("foo");
}
if ((fourth(), 1)) console.log("then");
if ((fourth(), 1)) console.log("again");
