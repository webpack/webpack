// No object equals `null` or `undefined`: a literal, or a `let` or `const` set once to one, read past it.
var log = [];
log.push({} == null, [] === void 0, null != function () {}, /a/ !== undefined);
const options = { value: 42 };
log.push(options);
log.push(options == null ? void 0 : options.value);
log.push(options === null || options === void 0 ? "none" : options.value);
let list = [];
log.push(list);
log.push(list ? list.length : -1, list && "set");
// A `var`, a name written again or read before its declarator, and a literal running code keep the test.
var held = {};
log.push(held);
log.push(held == null);
let changed = {};
log.push(changed);
changed = null;
log.push(changed == null);
function early() {
	return late == null;
}
try {
	early();
} catch (error) {
	log.push(error.name);
}
const late = {};
log.push(late, early());
log.push({ a: log.push("ran") } == null);
console.log(log);
