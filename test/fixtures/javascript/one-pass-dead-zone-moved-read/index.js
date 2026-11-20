const f = () => x;
const g = () => y;
function h() {
	return z;
}
const x = 2,
	y = 3,
	z = 4;
console.log(x, y, z, f(), g(), h());

function early() {
	const read = () => value;
	console.log(read());
	const value = 1;
}
try {
	early();
} catch (e) {
	console.log(e.name);
}

function inInit() {
	function read() {
		return value;
	}
	const value = read();
	return value;
}
try {
	console.log(inInit());
} catch (e) {
	console.log(e.name);
}

function afterCall(run) {
	function read() {
		return value;
	}
	run();
	const value = 5;
	return read();
}
console.log(afterCall(function () {}));

function passed(value) {
	function read() {
		return value;
	}
	return read();
}
console.log(passed("Hello"));
