var c = 0;
function a() {
	console.log("a", c);
}
c++;
[
	void function () {
		console.log("first", c);
	}(),
	c++
];
[
	c++,
	void function (x) {
		console.log("passed", x, c);
	}(c),
	c++
];
({
	a: void function () {
		a();
		c++;
		a();
	}(),
	b: c++
});
[
	c = c + 1,
	typeof void function () {
		console.log("typeof void", c);
	}(),
	[
		void function () {
			if (c) return;
			console.log("never");
		}()
	]
];
c++, void function () {
	console.log("sequence", c);
}(), c++;
c++, typeof function () {
	console.log("typeof", c);
}(), c++;
({
	get x() {
		return 1;
	},
	b: void function () {
		console.log("getter", c);
	}()
});
console.log(c);
