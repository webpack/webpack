var callback;
export default function setHandler(cb) {
	callback = cb;
};

if(module.hot) {
	module.hot.dispose(function() {
		callback(module.id);
	});
}
---
---
export default module.id;