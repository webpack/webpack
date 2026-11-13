function label(node) {
	if (node.type === "a") return node.value.name;
	if (node.type === "b" && node.flag) return node.value.name;
	if (!node.type) return node.value.name;
	return "other";
}

function check(node) {
	if (node.bad) throw new Error("invalid " + node.type);
	if (node.type == null) throw new Error("invalid " + node.type);
	throw new TypeError("unknown " + node.type);
}

function pick(a, b, c) {
	if (a ?? b) return String(c);
	if (b ?? c) return String(c);
	if ((a = b)) return String(c);
	return String(a);
}

const nodes = [
	{ type: "a", value: { name: "x" } },
	{ type: "b", flag: true, value: { name: "y" } },
	{ type: "b", value: { name: "z" } },
	{ value: { name: "w" } }
];
for (const node of nodes) console.log(label(node));
for (const node of [{ bad: true, type: "q" }, {}, { type: "r" }]) {
	try {
		check(node);
	} catch (error) {
		console.log(error.message);
	}
}
console.log(pick(null, 0, 1), pick(null, null, 2), pick(null, null, null));
