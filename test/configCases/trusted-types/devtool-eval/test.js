// Evaluated through the test's global `eval`, so no global object name is in scope on Node 10.
Object.freeze({});
var test = {
	foo: 'bar'
};

module.exports = test;
