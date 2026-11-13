(function () {
	const text = "{globalThis.flag=1}";
	console.log("%s", `${globalThis.name} has $${text} left`, globalThis.flag);
})();
