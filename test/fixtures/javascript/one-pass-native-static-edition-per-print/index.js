var log = [];
function effect() {
	log.push("effect");
	return 1;
}
function f() {
	var v = effect();
	return Promise.withResolvers(v);
}
console.log(typeof f(), log.join(","));
