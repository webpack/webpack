function open(name) {
	return { [Symbol.dispose]() { console.log("close", name); } };
}
{
	using first = open("a");
	using second = open("b");
	using none = null;
	console.log(first, second, none);
}
async function run() {
	await using one = open("c");
	await using two = open("d");
	using three = open("e");
	console.log(one, two, three);
}
run();
