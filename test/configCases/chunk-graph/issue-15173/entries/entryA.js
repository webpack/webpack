import { commonUtil } from "../commonSync";

export default {
	doSomethingInEntryA() {
		return commonUtil("entryA");
	},
	getFeatureA() {
		return import(/* webpackChunkName: 'featureA' */ "../featureA");
	},
	getFeatureB() {
		return import(/* webpackChunkName: 'featureB' */ "../featureB");
	}
};

it("common async should contain self only", () => {
	expect(
		__STATS__.chunks.find(c => c.names.includes("commonAsync")).modules
	).toHaveLength(1);
});
