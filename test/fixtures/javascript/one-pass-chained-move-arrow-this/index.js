function check() {
	const read = () => this.tag + 1;
	const forward = () => read() + 1;
	return [function () { return forward() + 1; }, 2];
}
console.log(check.call({ tag: 1 })[0].call({ tag: 10 }));
function deeper() {
	const read = () => this.tag;
	const middle = () => read() + "m";
	const forward = () => middle() + "f";
	return function () { return forward(); };
}
console.log(deeper.call({ tag: "o" }).call({ tag: "i" }));
function counts() {
	const read = () => arguments.length;
	const forward = () => read() + 1;
	return function () { return forward(); };
}
console.log(counts(1, 2)(1, 2, 3, 4, 5));
var holder = {
	method() {
		const read = () => super.toString === Object.prototype.toString;
		const forward = () => read();
		return function () { return forward(); };
	}
};
console.log(holder.method()());
function arrows() {
	const read = () => this.tag;
	const forward = () => read() + "f";
	return () => forward();
}
console.log(arrows.call({ tag: "o" }).call({ tag: "i" }));
