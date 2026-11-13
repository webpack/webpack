function warn(name, ref) {
	console.log(
		'Component "%s" contains the string ref "%s". ' +
			"Support for string refs will be removed in a future major release.",
		name,
		ref
	);
}
function quoted() {
	return 'Say "hi" ' + 'or "bye"';
}
function escaped() {
	return "tab\t" + "new\nline";
}
warn("a", "b");
console.log(quoted(), escaped());
function mixed() {
	return "''''" + '""""';
}
console.log(mixed());
