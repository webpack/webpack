// A store to a plain class's own `prototype` runs only its value.
(class {}).prototype.destroy = console.log("value");
(class { destroy() {} }).prototype.destroy = 1;
console.log("read", ((class {}).prototype.other = 2));
// An accessor, a superclass or a computed key may take the store.
(class {
	set destroy(value) {
		console.log("set", value);
	}
}).prototype.destroy = 3;
class Base {
	set destroy(value) {
		console.log("base", value);
	}
}
(class extends Base {}).prototype.destroy = 4;
(class {
	["destroy"]() {}
}).prototype.destroy = 5;
(class {
	destroy() {
		console.log("method");
	}
}).prototype.destroy = console.log("kept value");
