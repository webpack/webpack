var log = [];
function tick() {
	log.push("tick");
	return 1;
}
function plain() {
	var value = tick(),
		unused = +1n;
	return value;
}
try {
	plain();
} catch (error) {
	log.push(error.name);
}
function nested() {
	var value = tick(),
		unused = [+1n];
	return value;
}
try {
	nested();
} catch (error) {
	log.push(error.name);
}
function negated() {
	var value = tick(),
		unused = -1n;
	return value;
}
log.push(negated());
function passed(argument) {
	tick();
	return argument;
}
try {
	passed([+1n]);
} catch (error) {
	log.push(error.name);
}
console.log(log.join());
