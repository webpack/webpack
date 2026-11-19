var flag = Math.random() < 2;
var count = 0;
console.log({ key: "FAIL", key: flag ? "PASS" : "FAIL" }.key);
console.log([{ key: flag || "no" }.key], { key: (count += 2) }.key);
console.log({ key: flag ? 1 : 2 }.key + 1, { key: count++ }.key, count);
function read() {
	return { key: flag && "yes" }.key;
}
console.log(read(), read());
