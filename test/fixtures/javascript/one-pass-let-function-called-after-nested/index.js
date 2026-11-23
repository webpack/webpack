var yield = "name";
function nested() {
	const read = () => 1;
	function outer() {
		function inner() {
			return read();
		}
		return inner();
	}
	return outer();
}
console.log(nested());
function written() {
	const read = () => 2;
	function call() {
		return read();
	}
	console.log(call());
	call = null;
	return call;
}
console.log(written());
function named() {
	const read = () => yield;
	function call() {
		return read();
	}
	return call();
}
console.log(named());
