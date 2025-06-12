export const asyncData = {
	loaded: true,
	content: "Async shared content"
};

if (module.hot) {
	module.hot.accept();
}
