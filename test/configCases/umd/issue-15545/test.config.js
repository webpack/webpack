const CONTEXT = {};
module.exports = {
	nonEsmThis(module) {
		return CONTEXT;
	},
	findBundle() {
		return ["./runtime.js", "./main.js"];
	}
};
