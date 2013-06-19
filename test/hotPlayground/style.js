// This file can update, because it accept itself.
// A dispose handler removes the old <style> element.

var cssCode = "body { background: green; }";

var head = document.getElementsByTagName("head")[0];

var styleElement = document.createElement("style");
styleElement.type = "text/css";
if (styleElement.styleSheet) {
	styleElement.styleSheet.cssText = cssCode;
} else {
	styleElement.appendChild(document.createTextNode(cssCode));
}
head.appendChild(styleElement);

if(module.hot) {
	module.hot.accept();
	module.hot.dispose(function() {
		head.removeChild(styleElement);
	});
}
