// A value read once as the object of a member set folds into it.
var target = {};
var log = [];
function make(name) {
	log.push(name);
	return target;
}
function key(name) {
	log.push(name);
	return "k";
}
console.log(
	(function (value) {
		var object = make("a");
		return object.set = value;
	})(1),
	target.set
);
(function (value) {
	var object = make("b");
	object.added += value;
})(2);
// Folded in turn, each value runs where it did: the object, then the key.
console.log(
	(function (value) {
		var object = make("c");
		var name = key("d");
		var result = object[name] = value;
		return result;
	})(3),
	target.k
);
console.log(
	(function () {
		var object = make("e");
		var name = key("f");
		var result = object[name];
		return result;
	})()
);
// A key run first keeps its object's value where it is.
(function (value) {
	var name = key("g");
	var object = make("h");
	object[name] = value;
})(4);
console.log(
	(function () {
		var object = make("i");
		var name = key("j");
		return name + object.k;
	})()
);
// A top-level `const` read as long as its value prints the value.
const a = 1;
console.log(a, log.join(""));
// A function moved to its one call, read off where a member of it is set,
// takes the parentheses the same call written in place takes.
function setInnermost(chain, value, plain) {
	return () => {
		if (plain) {
			chain.value = value;
		} else {
			const innermost = innermostOf(chain);
			innermost.value = value;
		}
	};
}
function innermostOf(node) {
	while (node.next) node = node.next;
	return node;
}
var chain = { next: { next: {} } };
setInnermost(chain, 3, false)();
console.log(chain.next.next.value);
// Read rather than set, or used as a key, the same call takes no parentheses.
function readInnermost(chain) {
	const innermost = firstOf(chain);
	return innermost.value;
}
function firstOf(node) {
	while (node.next) node = node.next;
	return node;
}
function keyed(table, chain) {
	const key = keyOf(chain);
	return table[key];
}
function keyOf(node) {
	while (node.next) node = node.next;
	return node.name;
}
console.log(
	readInnermost(chain),
	keyed({ last: 4 }, { next: { name: "last" } })
);
