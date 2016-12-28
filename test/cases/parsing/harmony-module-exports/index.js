import './harmony';
import { bar } from './harmony-shadow.js';
import './commonjs';
import './loose';

it("should correctly export even when module or exports are shadowed", function () {
  (typeof bar).should.equal("function");
})

it("still has a '__filename' free var", function () {
	(typeof __filename).should.equal("string");
});

it("still has a '__dirname' free var", function () {
	(typeof __dirname).should.equal("string");
});

it("doesn't inject the 'module' shim even when providing __dirname", function () {
  // do a dynamic-looking key lookup on module, which normally forces the shim to be added
  var keyname = "loaded";
  (function () { module[keyname]; }).should.throw();
})
