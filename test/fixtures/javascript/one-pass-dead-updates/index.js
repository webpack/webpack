var first = 0,
	second = 0;
console.log("logged") && (first++, second++);

let counter = 0;
counter++, counter++, counter--;

function local() {
	let count = 0;
	count++;
	count++;
	return "local";
}
console.log(local());

var seen = 0;
var kept = console.log((seen++, "value"));

var object = 0;
object = {
	valueOf: function () {
		console.log("valueOf");
		return 1;
	}
};
object++;

var read = 0;
read++;
console.log(read);

function early() {
	late++;
}
try {
	early();
} catch (error) {
	console.log(error.name);
}
let late = 0;
early();

var branch = 0;
console.log("test") ? (branch++, console.log("yes")) : (branch--, console.log("no"));

var looped = 0;
for (var index = 0; index < 3; index++) looped++;
console.log(index);
