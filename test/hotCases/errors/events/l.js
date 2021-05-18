export default 1;
module.hot.accept((err, { moduleId }) => {
	throw new Error(`Error in accept error handler: ${moduleId}`)
});
---
export default 2;
throw new Error("Error while loading module l");
