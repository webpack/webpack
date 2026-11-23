function loop(value) {
	for (var unread; ; ) {
		console.log((unread, value));
		break;
	}
}
function counted(value) {
	for (var count = 0, unread; count < 2; count++) {
		unread;
		console.log(value, count);
	}
}
function kept(value) {
	for (var read; ; ) {
		console.log((read, value), read);
		break;
	}
}
loop(1);
counted(2);
kept(3);
