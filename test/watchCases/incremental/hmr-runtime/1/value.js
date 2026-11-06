var state = require("./state");
module.exports = {
	value: 2 + require("./children/old"),
	previous: module.hot.data ? module.hot.data.value : null
};
module.hot.dispose(function(data) {
	data.value = 2;
	state.disposed.push("value:2");
});
