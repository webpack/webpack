var log = [];
var object = {
	method: function () {
		log.push(this === object);
	}
};
function check() {
	log.push("check");
	return log.length;
}
function value() {
	log.push("value");
	return 2;
}
function run() {
	check() && (1, value());
	for (var i = 0; i < 2 && check(); 1) i++;
	var arrow = () => (0, 5);
	log.push(arrow(), (0, object.method)(), check() || (1, value()));
	log.push(`${(0, value())}`, (check(), value()) ** 2);
}
run();
run();
console.log(log.join());
