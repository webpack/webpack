// This file can update, because 'index.js' accepts it.

const element = document.createElement("h4");

element.innerText = "This is 'element.js'.";

const bold = document.createElement("b");

bold.innerHTML = require("./element-dependency");
element.appendChild(bold);

module.exports = element;
