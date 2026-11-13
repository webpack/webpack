function Item(name) {
	(function (instance, Constructor) {
		if (!(instance instanceof Constructor)) throw TypeError("Cannot call a class as a function");
	})(this, Item);
	this.name = name;
}
console.log(new Item("item").name);
try {
	Item("called");
} catch (error) {
	console.log(error.message);
}
function Short(value) {
	(function (self) {
		console.log({ self: typeof self });
		self.value = value;
	})(this);
}
console.log(new Short(1).value);
function Deletes() {
	(function (self) {
		console.log(delete self);
	})(this);
}
new Deletes();
var Expressed = function () {
	(function (self) {
		self.kept = 1;
	})(this);
};
console.log(new Expressed().kept);
class Base {}
class Derived extends Base {
	constructor() {
		super();
		var arrow = () => {
			(function (self) {
				self.set = 1;
			})(this);
		};
		arrow();
		arrow();
	}
}
console.log(new Derived().set);
(function (self) {
	console.log(typeof self);
})(this);
