import { commonUtil } from "../commonSync";

export default {
	doSomethingInEntryB() {
		return commonUtil("entryB");
	},
	getFeatureC() {
		return import(/* webpackChunkName: 'featureC' */ "../featureC");
	}
};
