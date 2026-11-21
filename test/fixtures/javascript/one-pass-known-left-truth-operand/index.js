var count = 0;
var log = [];
function effect() {
	log.push("effect");
	return 0;
}
function step() {
	log.push("step");
	if (++count > 2) throw new Error("stop");
}
try {
	while ((effect(), 1) && 1) step();
} catch (error) {}
count = 0;
try {
	do step();
	while ((effect(), 1) && !0);
} catch (error) {}
log.push(!((effect(), 1) && 1));
log.push((effect(), 0) || 0 ? "yes" : "no");
console.log(log.join());
