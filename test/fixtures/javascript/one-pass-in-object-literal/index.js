const object = { someprop: "bar", o: true };
"someprop" in object;
"someprop" in object;
let asked = { a: 1 };
"x" in asked, 1 in asked;
console.log("a" in asked);
"x" in { a: 1 };

"x" in { a: console.log("runs") };
/x/ in { a: 1 };
String(console.log("key")) in { a: 1 };
"x" in [];
try {
	"x" in late;
} catch (e) {
	console.log("dead zone");
}
let late = { a: 1 };
function f() {
	"x" in later;
	return 1;
}
try {
	f();
} catch (e) {
	console.log("dead zone in a call");
}
const later = { a: 1 };
console.log(f());
