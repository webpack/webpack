function postfix(convert) {
	let value = { valueOf: () => convert("postfix") };
	value++;
}

function prefix(convert) {
	let value = { valueOf: () => convert("prefix") };
	++value;
}

function compound(convert) {
	let value = { valueOf: () => convert("compound") };
	value += 2;
}

function memberUpdate(convert) {
	let value = { field: { valueOf: () => convert("member update") } };
	return convert("before update") + value.field++;
}

function memberAssignment(convert) {
	let value = { field: { valueOf: () => convert("member assignment") } };
	return convert("before assignment") + (value.field += 2);
}

postfix(console.log);
prefix(console.log);
compound(console.log);
memberUpdate(console.log);
memberAssignment(console.log);
