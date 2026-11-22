function constant() {
	const f = function named() {
		return named;
	};
	function check() {
		return f();
	}
	return check() === check();
}
console.log(constant());
function changing() {
	let f = function named() {
		return named;
	};
	function check() {
		return f();
	}
	return check() === check();
}
console.log(changing());
function plain() {
	var f = function named() {
		return named;
	};
	function check() {
		return f();
	}
	return check() === check();
}
console.log(plain());
