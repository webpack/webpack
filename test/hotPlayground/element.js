// This file can update, because 'index.js' accept it.

var element = document.createElement("h4");
element.innerText = "This is 'element.js'.";
var x = document.createElement("b");
x.innerHTML = require("./element-dependency");
element.appendChild(x);
module.exports = element;