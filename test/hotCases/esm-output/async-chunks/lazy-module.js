export const data = { 
	type: "lazy", 
	value: 42
};

if (module.hot) {
	module.hot.accept();
}
---
export const data = { 
	type: "lazy", 
	value: 100
};

if (module.hot) {
	module.hot.accept();
}
