import("./lazy").then((lazy) => {
	postMessage(lazy.default);
});
