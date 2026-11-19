var calls = 0;
function check() {
	calls++;
	return calls > 1;
}
function run() {
	var negated = !check(),
		picked = check() ? 1 : 0;
	var truth;
	truth = !!check();
	truth = !check();
	return calls;
}
console.log(run(), run());
