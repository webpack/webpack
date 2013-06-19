// This file can update, because it accept itself.
// A dispose handler removes the old <style> element.

var addStyle = require("./addStyle");

var dispose = addStyle("body { color: blue; }");

if(module.hot) {
	module.hot.accept();
	module.hot.dispose(dispose);
}
