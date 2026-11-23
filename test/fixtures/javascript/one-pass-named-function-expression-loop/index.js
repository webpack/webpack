function constant() {
	const f = function self() {
		return self;
	};
	const results = [];
	for (let i = 0; i < 2; i++) results.push(f());
	return results[0] === results[1];
}
console.log(constant());
function changing() {
	let f = function self() {
		return self;
	};
	const results = [];
	let i = 0;
	while (i++ < 2) results.push(f());
	return results[0] === results[1];
}
console.log(changing());
function plain() {
	var f = function self() {
		return self;
	};
	var results = [];
	for (var i = 0; i < 2; i++) results.push(f());
	return results[0] === results[1];
}
console.log(plain());
function nested() {
	var f = function self() {
		return self;
	};
	var results = [];
	function run() {
		results.push(f());
	}
	run();
	run();
	return results[0] === results[1];
}
console.log(nested());
function once() {
	const f = function self() {
		return typeof self;
	};
	return f();
}
console.log(once());
