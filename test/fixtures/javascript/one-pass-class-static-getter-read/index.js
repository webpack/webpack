// A read of a class's static getter, its own or its superclass's, runs it.
(class {
	static get seen() {
		console.log("own");
		return 1;
	}
}).seen;
class Base {
	static get seen() {
		console.log("inherited");
		return 2;
	}
}
(class extends Base {}).seen;
// A static method or setter is no getter: the read goes.
(class {
	static seen() {}
}).seen;
(class {
	static set seen(value) {}
}).seen;
console.log("done");
