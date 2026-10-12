var state = require("./state");
module.exports = {
	value: 3 + require("./children/new"),
	previous: module.hot.data ? module.hot.data.value : null
};
module.hot.dispose(function(data) {
	data.value = 3;
	state.disposed.push("value:3");
});
