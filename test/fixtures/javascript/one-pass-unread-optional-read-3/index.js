var log = [];
var count = 0;
var literal = {
	get b() {
		log.push("literal getter");
	}
};
literal?.b;
(count++, {})?.d;
function make() {
	log.push("make");
	return { a: {} };
}
make()?.a?.b;
console.log(log.join(), count);
