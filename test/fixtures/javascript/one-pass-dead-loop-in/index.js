var o = { k: 1 };
for (var x = (a => "k" in a); 0; ) console.log("never");
console.log(x(o));
for (var y = ("k" in o), z = ("q" in o); 0; ) y = 1;
console.log(y, z);
function f(p) {
	for (w = ("k" in p); false; );
	return w;
}
var w;
console.log(f(o));
label: for (var v = ("k" in o); 0; ) break label;
console.log(v);
try {
	for (var t = ("k" in null); 0; );
} catch (e) {
	console.log(e.name);
}
for (var unused = ("k" in o), alsoUnused = 1; 0; );
console.log("end");
