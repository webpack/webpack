var calls = 0;
function count() {
	calls++;
	return calls;
}
function step() {
	calls += 10;
	return calls;
}
function once() {
	calls++;
	return calls;
}
function run() {
	!once();
	!count();
	void count();
	return calls;
}
console.log(run());
!step();
console.log(calls);
