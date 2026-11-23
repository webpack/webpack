function log(name) {
	console.log("got", name);
}
const defined = {};
Object.defineProperty(defined, "x", {
	get: function () {
		log("defined");
	}
});
defined.x;
const listed = {};
Object.defineProperties(listed, {
	x: {
		get: function () {
			log("listed");
		}
	}
});
listed.x;
const reflected = {};
Reflect.defineProperty(reflected, "x", {
	get: function () {
		log("reflected");
	}
});
reflected.x;
const legacy = {};
legacy.__defineGetter__("x", function () {
	log("legacy");
});
legacy.x;
function define(target) {
	Object.defineProperty(target, "x", {
		get: function () {
			log("handed");
		}
	});
}
const handed = {};
define(handed);
handed.x;
const aliased = {};
var alias = aliased;
define(alias);
aliased.x;
const method = {
	m: function () {
		define(this);
	}
};
method.m();
method.x;
function fn() {}
define(fn);
fn.x;
const quiet = { a: 1 };
var unread = quiet.a;
console.log("end");
