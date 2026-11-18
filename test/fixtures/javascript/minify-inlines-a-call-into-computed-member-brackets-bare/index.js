var holder = { name: 1 };
function key() {
	console.log("key");
	return "name";
}
console.log(holder[key()]);
