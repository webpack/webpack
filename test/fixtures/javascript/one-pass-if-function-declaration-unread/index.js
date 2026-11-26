function unread(flag) {
	if (flag) function helper() {}
	console.log("unread", flag);
}
unread(0);
unread(1);

function other(flag) {
	if (flag) function helper() {}
	else console.log("else");
}
other(0);
other(1);

function read(flag) {
	if (flag)
		function helper() {
			return 1;
		}
	return typeof helper;
}
console.log(read(0), read(1));

function evaluated(flag) {
	if (flag) function helper() {}
	return eval("typeof helper");
}
console.log(evaluated(0), evaluated(1));
