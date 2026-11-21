function attempt(callback) {
	try {
		return callback();
	} catch (error) {
		return error.name;
	}
}
function broken(n) {
	switch (n) {
		case 0:
			let value = {};
			break;
		case 1:
			return typeof value;
	}
}
function fallthrough(n) {
	switch (n) {
		case 0:
			let value = {};
		case 1:
			return typeof value;
	}
}
function closure(n) {
	switch (n) {
		case 0:
			let value = {};
			return function () {
				return typeof value;
			};
		case 1:
			return function () {
				return typeof value;
			};
	}
}
function sameCase(n) {
	switch (n) {
		case 0:
			let value = [];
			return typeof value;
		case 1:
			return 1;
	}
}
console.log(
	attempt(function () {
		return broken(1);
	}),
	broken(0),
	fallthrough(0),
	attempt(function () {
		return fallthrough(1);
	}),
	closure(0)(),
	attempt(function () {
		return closure(1)();
	}),
	sameCase(0),
	sameCase(1)
);
