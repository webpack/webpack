// A function read off an object literal passed for a parameter, called once
// there, prints as what that function returns.
function pick(obj) {
	return obj.bar();
}
console.log(
	pick({
		bar: function () {
			return 2;
		}
	})
);
var count = 0;
function counted(obj) {
	return obj.next();
}
console.log(
	counted({
		next: function () {
			return count++;
		}
	}),
	count
);
function prefixed(obj) {
	return obj.run();
}
console.log(
	prefixed({
		run: function () {
			console.log("first");
			return 3;
		}
	})
);
// One reading `this` takes the literal as `this`, so it stays.
function own(obj) {
	return obj.get();
}
console.log(
	own({
		get: function () {
			return this.value;
		},
		value: 4
	})
);
function getter(obj) {
	return obj.bar();
}
console.log(
	getter({
		get bar() {
			console.log("getter");
			return function () {
				return 5;
			};
		}
	})
);
function inherited(obj) {
	return obj.bar();
}
console.log(
	inherited({
		__proto__: {
			bar: function () {
				return 6;
			}
		}
	})
);
