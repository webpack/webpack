module.exports = function() {
	var err = new Error("Message");
	err.stack = "Stack";
	err.hideStack = true;
	throw err;
};
