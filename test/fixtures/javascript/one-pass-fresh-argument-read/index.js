console.log(
	(function (list) {
		list.length;
		return 1;
	})([1, 2])
);
console.log(
	(function (object) {
		object.x;
		return 2;
	})({ x: 1 })
);
console.log(
	(function (list) {
		arguments[0] = [3];
		list.length;
		return list;
	})([1, 2])
);
