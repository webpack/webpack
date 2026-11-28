// A key read off a literal made there nobody reads runs only the key.
function key(label) {
	console.log(label);
	return "a";
}
({ a: 1, b: 2 })[key("object")];
[1, 2][key("array")];
// A getter, or a value running code, keeps the read.
({
	get a() {
		console.log("getter");
		return 1;
	}
})[key("getter")];
({ a: key("value") })[key("valued")];
// A prototype the literal sets may answer the key by a getter.
try {
	({
		__proto__: {
			get a() {
				throw new Error("inherited");
			}
		}
	})[key("inherited")];
} catch (error) {
	console.log(error.message);
}
({ __proto__: null, b: 1 })[key("null prototype")];
var read = { a: 3 }[key("read")];
console.log(read);
