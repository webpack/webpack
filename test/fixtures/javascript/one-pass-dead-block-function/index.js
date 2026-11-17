const OFF = false;
if (OFF) {
	console.log("unreachable");
	var kept;
	function hoisted() {}
}
console.log(typeof kept, typeof hoisted);

if (1) console.log("taken");
else {
	function other() {}
}
console.log(typeof other);

function inner() {
	if (0) {
		function local() {}
	}
	return typeof local;
}
console.log(inner());

if (0) {
	let blocked;
	{
		function blocked() {}
	}
}
console.log(typeof blocked);

if (0) {
	async function later() {}
}
console.log(typeof later);
