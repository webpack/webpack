try {
	(function () {
		const {} = Object;
		console.log("no throw");
	})();
} catch (e) {
	console.log(e.name);
}
