var fs = require('fs');
var path = require('path');

afterEach(done => {
	delete global['ext-lib'];
	done();
});

it('should correctly import a deep structure', function () {
	global['ext-lib'] = {alpha: {beta: {gamma: 'MyClass'}}};
	var external = require('ext-lib/alpha/beta/gamma');
	expect(external).toBe('MyClass');
});

it('should contain simple require statements for the commonjs external', function () {
	global['ext-lib'] = {alpha: {beta: {gamma: 'MyClass'}}};
	var source = fs.readFileSync(path.join(__dirname, 'bundle0.js'), 'utf-8');
	expect(source).toMatch('global["ext-lib"]["alpha"]["beta"]["gamma"]');
});
