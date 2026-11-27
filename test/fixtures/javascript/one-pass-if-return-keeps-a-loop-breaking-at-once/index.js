var log = [];
[true, false].forEach(function (a) {
	log.push(
		(function () {
			if (a) return;
			for (let i = 0; i < 2; i++) break;
		})()
	);
});
console.log(log.join());
