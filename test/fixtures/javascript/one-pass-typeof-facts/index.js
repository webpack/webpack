function moved() {}
console.log(typeof moved);
console.log(!typeof missing, "" == typeof missing, "stirng" !== typeof Math);
console.log("number" == typeof missing, "stirng" == typeof String(1));
console.log(typeof [function () {}][0], typeof [{}, 1][0], typeof [1][0]);
try {
	console.log(!typeof late, "" == typeof late);
} catch (error) {
	console.log(error.name);
}
let late = 1;
// A later parameter is uninitialized while a default before it runs.
function beforeParameter(a = !typeof b, b) {
	return a;
}
function comparesBeforeParameter(a = "" == typeof b, b) {
	return a;
}
try {
	console.log(beforeParameter());
} catch (e) {
	console.log(e.name);
}
try {
	console.log(comparesBeforeParameter());
} catch (e) {
	console.log(e.name);
}
