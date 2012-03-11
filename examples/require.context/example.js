function getTemplate(templateName) {
	return require("./templates/"+templateName);
}
console.log(getTemplate("a"));
console.log(getTemplate("b"));