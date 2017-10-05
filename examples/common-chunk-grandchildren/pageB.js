module.exports = function() {
	console.log("Page B");
	require.ensure([], ()=>{
		const page = require("./pageC");
		page();
	});
};
