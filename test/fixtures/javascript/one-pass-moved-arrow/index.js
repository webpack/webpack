// An arrow read once in a nested function moves there, as a function
// expression does, where it reads no `this`, `arguments`, `super` or
// `new.target`, or only arrows lie between.
var log = [];
var each = function (callback) {
	callback();
	callback();
};
var counter = { count: 0 };
var bump = () => {
	counter.count++;
};
each(() => {
	bump();
});
const say = () => {
	log.push("say");
};
each(function () {
	say();
});
log.push(counter.count);
function Holder() {
	this.value = 1;
	const read = () => {
		log.push(this.value);
	};
	each(() => {
		read();
	});
	// Kept: a function between binds its own `this`.
	const kept = () => {
		log.push(this === undefined || this.value);
	};
	each(function () {
		kept();
	});
}
new Holder();
function args() {
	const first = () => {
		log.push(arguments[0]);
	};
	each(function () {
		first();
	});
}
args("arg");
class Base {
	m() {
		return "base";
	}
}
class Derived extends Base {
	m() {
		const up = () => {
			log.push(super.m());
		};
		each(function () {
			up();
		});
	}
}
new Derived().m();
function target() {
	const made = () => {
		log.push(new.target === undefined);
	};
	each(function () {
		made();
	});
}
target();
new target();
console.log(log.join());
