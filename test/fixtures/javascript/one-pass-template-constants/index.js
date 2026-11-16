function upper(text) {
	const head = text.toUpperCase();
	const tail = "line 2".toUpperCase();
	return `${head}\n${tail}`;
}
function literal(text) {
	const head = text.trim();
	const tail = "k";
	return `${head}${tail}`;
}
function number(text) {
	const head = text.trim();
	const tail = 2;
	return `<${head}|${tail}>`;
}
function read(object, key) {
	const head = object.toString();
	const tail = key.length;
	return `${head}${tail}`;
}
var seen = [];
var counted = {
	toString() {
		seen.push("toString");
		return "counted";
	}
};
function converts(text) {
	const tail = seen.length;
	return `${text}${tail}`;
}
console.log(upper("a"), literal(" b "), number(" c "), read(1, "de"));
console.log(converts(counted), seen.join());
