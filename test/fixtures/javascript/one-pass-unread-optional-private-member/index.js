class A {
	#x = 1;
	static t(make) {
		make()?.#x;
		console.log("read");
	}
}
try {
	A.t(() => ({}));
} catch (e) {
	console.log(e.name);
}
