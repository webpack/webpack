var log = [];
function make(value) {
	log.push("make");
	return value;
}
make(null)?.unused;
make({})?.unused?.deeper;
make({ unused: {} })?.unused.kept;
make(void 0)?.[make("key")];
make({})?.["literal"];
try {
	make({})?.unused.throws;
} catch (e) {
	log.push(e.name);
}
var literal = {
	get unused() {
		log.push("getter");
		return 1;
	}
};
({
	get unused() {
		log.push("literal getter");
	}
})?.unused;
(function () {
	return make(literal);
})()?.notAGetter;
({ a: make(1) })?.b;
var read = make({ a: 1 })?.a;
console.log(log.join(), read);
