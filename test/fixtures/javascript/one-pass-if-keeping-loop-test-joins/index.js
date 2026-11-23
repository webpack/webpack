var log = [];
function check() {
	log.push("check");
	return log.length > 1;
}
function kept(y) {
	log.push("kept");
	if (1) while (y.z) break;
	log.push("after");
}
function tested(y) {
	log.push("tested");
	if (check()) while (y) break;
	else log.push("else");
	log.push("after");
}
kept({ z: 1 });
kept({ z: 0 });
tested(1);
tested(0);
console.log(log.join());
