!function () {
	try {
		console.log(missing);
	} catch (error) {
		console.log("caught", error.name);
	}
}();
