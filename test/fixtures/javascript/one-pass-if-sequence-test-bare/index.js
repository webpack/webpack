var log = [];
function step(name) {
	log.push(name);
	return log.length;
}
function chosen(flag) {
	if ((step("first"), flag)) step("yes");
	else log.push("no");
	if (({}.x, flag)) log.push("again");
	else step("other");
}
chosen(1);
chosen(0);
console.log(log.join());
