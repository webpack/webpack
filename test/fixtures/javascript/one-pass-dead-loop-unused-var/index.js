function run(flag) {
	console.log("start", flag);
	for (var unused, other; 0; ) console.log("never");
	return flag;
}
console.log(run(1), run(2));
