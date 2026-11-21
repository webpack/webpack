// A function called where nothing reads its call ends with what its value
// runs, the `return` gone, where it stays a function.
var log = [];
var keep = function (callback) {
	log.push(callback());
	return { value: 1 };
};
function run() {
	log.push("run");
	return 2;
}
!(function () {
	var count = 1;
	keep(function () {
		return count++;
	});
	return run();
})();
!(function () {
	var count = 1;
	keep(function () {
		return count++;
	});
	return { value: run() }.value;
})();
!(function () {
	var count = 1;
	keep(function () {
		return count++;
	});
	return (function () {
		log.push("inner");
	})();
})();
(function () {
	var count = 1;
	keep(function () {
		return count++;
	});
	return run();
})(),
	log.push("after");
// Kept: the call is read, the function reads its own name or `arguments`,
// is async, or the `return` is not its last statement.
var read = (function () {
	var count = 1;
	keep(function () {
		return count++;
	});
	return run();
})();
log.push(read);
!(function self() {
	var count = 1;
	keep(function () {
		return count++;
	});
	return self.length + run();
})();
!(function () {
	var count = 1;
	keep(function () {
		return count++;
	});
	return arguments.length + run();
})(1);
!(async function () {
	var count = 1;
	keep(function () {
		return count++;
	});
	return run();
})();
!(function () {
	var count = 1;
	keep(function () {
		return count++;
	});
	if (count) return run();
	return keep(run);
})();
console.log(log.join());
