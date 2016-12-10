// function getTemplate(templateName) {
// 	return import("./templates/"+templateName);
// }
// console.log(getTemplate("a"));
// console.log(getTemplate("b"));

async function getTemplate(templateName) {
	try {
		let template = await import(`./templates/${templateName}`);
		console.log(template);
	} catch(err) {
		console.error("template error");
		return new Error(err);
	}
}

getTemplate("a");
getTemplate("b");
getTemplate("c");


