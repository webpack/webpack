import bar_string from './bar';

let other;

function foo(value) {
	other = value;
}

var my_class = class {
	constructor() {
		this.bar = bar_string;
		foo(bar_string);
	}
},  my_instance = (new my_class())


it("should mangle imports in class constructors", function() {
	expect(bar_string).toBe("bar");
	expect(my_instance.bar).toBe(bar_string);
	expect(other).toBe(bar_string);
});
