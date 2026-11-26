function plain() {
	const make = () => (console.log("made"), 2);
	var holder = { value: make?.() };
	return holder.value;
}
console.log(plain());

function declared() {
	function add(a) {
		console.log("add", a);
		return a + 1;
	}
	return [add?.(4)];
}
console.log(declared()[0]);

function chained() {
	const make = () => ({ x: 3 });
	return make?.().x;
}
console.log(chained());

function kept() {
	let make = () => 12;
	return [make?.(), typeof make];
}
console.log(kept().join());
