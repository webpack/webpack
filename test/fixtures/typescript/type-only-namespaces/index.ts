namespace Types {
	export type Id = string;
	interface Hidden {}
	namespace Nested {
		type Deep = number;
	}
}
namespace Dotted.Name {}
export namespace ExportedTypes {
	export interface Shape {}
}
const after = 1;
