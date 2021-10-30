const createHash = require("../lib/util/createHash");

const compare = require("./micro-compare");

const size = 50;

const strings = [];
for (let count = 1; ; count *= 10) {
	while (strings.length < count) {
		const s = require("crypto").randomBytes(size).toString("hex");
		strings.push(s);
		const hash = createHash("native-md4");
		hash.update(s);
		hash.update(s);
		hash.digest("hex");
	}
	let i = 0;
	console.log(
		`${count} different 200 char strings: ` +
			compare(
				"native md4",
				() => {
					const hash = createHash("native-md4");
					const s = strings[(i = (i + 1) % strings.length)];
					hash.update(s);
					hash.update(s);
					return hash.digest("hex");
				},
				"wasm md4",
				() => {
					const hash = createHash("md4");
					const s = strings[(i = (i + 1) % strings.length)];
					hash.update(s);
					hash.update(s);
					return hash.digest("hex");
				}
			)
	);
}
