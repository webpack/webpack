var log = [];
function key() {
	log.push("key");
	return "k";
}
delete null?.key;
delete (void 0)?.[key()];
console.log(delete null?.a.b(key()), delete { a: 1 }.a, log.length);
var k = {
	toString: function () {
		log.push("toString");
		return "a";
	}
};
console.log(delete { [k]: 1 }.a, delete { a: log.push("value") }.a, log.join());
try {
	delete null.deep?.key;
} catch (e) {
	console.log(e.name);
}
