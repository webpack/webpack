let state = "FAIL";
class Sets {
	static value = (state = "PASS");
}
console.log(state);

class Related {}
class Base {}
class Derived extends Base {
	static field = new Related();
}

{
	class Inner {}
	class Outer extends Base {
		static field = new Inner();
	}
}

let count = 0;
class Counted extends Base {
	static value = (() => {
		count++;
	})();
}
console.log(count);

class Logs {
	constructor() {
		console.log("constructed");
	}
}
new Logs();

class Field {
	value = console.log("field");
}
new Field();

function early() {
	return new Late();
}
try {
	early();
} catch (error) {
	console.log(error.name);
}
class Late {}
console.log(typeof early());

class Reset {}
Reset = function () {
	console.log("reset");
};
new Reset();

class UsesThis extends Base {
	static value = (() => console.log(typeof this))();
}
