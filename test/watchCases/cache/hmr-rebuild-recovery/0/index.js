var state = require("./state");
var current = require("./value");
state.entries++;
module.hot.accept("./value", function() {
	current = require("./value");
	state.accepted.push(current.value);
});
module.exports = {
	read: function() { return current; },
	state: function() { return state; },
	update: function() { return module.hot.check(true); },
	status: function() { return module.hot.status(); },
	cached: function(id) { return Object.prototype.hasOwnProperty.call(require.cache, id); }
};
