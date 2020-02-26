/**
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run `yarn special-lint-fix` to update
 */

export type ContainerReferencePlugin = {
	/**
	 * A list of requests that should be overridable by the host container
	 */
	overrides?:
		| any[]
		| {
				[k: string]: any;
		  };
	/**
	 * The libraryTarget of a remote build
	 */
	remoteType?: string;
	/**
	 * A list of remote scopes or namespaces that reference federated Webpack instances
	 */
	remotes?:
		| any[]
		| {
				[k: string]: any;
		  };
};
