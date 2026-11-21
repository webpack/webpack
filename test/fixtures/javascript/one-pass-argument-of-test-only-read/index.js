var log = [];
function tested(x) {
	if (x) {
	}
	log.push("tested");
}
function counted(x) {
	if (x) {
	}
	log.push(arguments.length);
}
function effect() {
	log.push("effect");
	return 1;
}
tested(1);
tested(effect());
counted(1);
log.push(tested.length);
console.log(log.join());
