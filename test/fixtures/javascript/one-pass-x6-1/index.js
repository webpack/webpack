function check(node) {
	function flagged(node) {
		return !!(node.flags & 4);
	}
	function either(node) {
		return !!(node.a || node.b);
	}
	function named(node) {
		return !!node.name;
	}
	function marked(node) {
		return !!(node.flags & 8);
	}
	function listed(node) {
		return !!(node.a && node.b);
	}
	if (flagged(node)) console.log("flagged");
	if (node.c && either(node)) console.log("either");
	if (node.c || listed(node)) console.log("listed");
	if (!named(node)) console.log("unnamed");
	if (!marked(node)) console.log("unmarked");
}
function value(node) {
	function flagged(node) {
		return !!(node.flags & 4);
	}
	return flagged(node);
}
check({ flags: 4, a: 1, b: 1, c: 1 });
check({ flags: 8, name: "n" });
console.log(value({ flags: 4 }));
