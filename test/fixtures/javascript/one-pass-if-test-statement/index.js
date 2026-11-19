var calls = 0;
function check() {
	calls++;
	return calls > 1;
}
function run() {
	var unread;
	check();
	if (check()) {
		unread = 1;
	} else {
		unread = 2;
	}
	check();
	if (check()) {
	}
	return calls;
}
console.log(run(), run());
