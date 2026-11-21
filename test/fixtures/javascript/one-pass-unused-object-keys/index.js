var log = [];
function foo() {
	log.push("foo");
	return 1;
}
({ [{ foo: foo() }]: 0 });
({ [[foo(), 2]]: 0 });
({ [{ a: foo() }]: foo(), b: foo() });
({ ["k"]: foo(), ...{ get g() { log.push("get"); } } });
var kept = { [{ foo: foo() }]: 0 };
console.log(log.join(), Object.keys(kept).join());
