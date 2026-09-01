export let nameDuringDefinition;

export default class {
	static observed = (nameDuringDefinition = this.name);
};
