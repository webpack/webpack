"use strict";

const Dependency = require("../lib/Dependency");
const Module = require("../lib/Module");
const ModuleGraph = require("../lib/ModuleGraph");

/**
 * @returns {Module} module
 */
const createModule = () => new Module("javascript/auto", null, null);

describe("ModuleGraph", () => {
	describe("_removeStaleOutgoingConnections", () => {
		it("removes only connections of the stale dependencies from both sides", () => {
			const moduleGraph = new ModuleGraph();
			const origin = createModule();
			const targetA = createModule();
			const targetB = createModule();
			const staleDependency = new Dependency();
			const freshDependency = new Dependency();
			moduleGraph.setResolvedModule(origin, staleDependency, targetA);
			moduleGraph.setResolvedModule(origin, freshDependency, targetB);

			moduleGraph._removeStaleOutgoingConnections(
				origin,
				new Set([staleDependency])
			);

			const outgoing = [...moduleGraph.getOutgoingConnections(origin)];
			expect(outgoing).toHaveLength(1);
			expect(outgoing[0].module).toBe(targetB);
			expect([...moduleGraph.getIncomingConnections(targetA)]).toHaveLength(0);
			expect([...moduleGraph.getIncomingConnections(targetB)]).toHaveLength(1);
		});
	});

	describe("_removeConnectionLoose", () => {
		// getConnection caches a miss as null, and that null hides a connection
		// later published through the lazy by-parent flush.
		it("keeps a connection made afterwards resolvable", () => {
			const moduleGraph = new ModuleGraph();
			const origin = createModule();
			const target = createModule();
			const dependency = new Dependency();

			moduleGraph.setParents(dependency, origin, origin);

			moduleGraph._removeConnectionLoose(dependency);
			moduleGraph.setResolvedModule(origin, dependency, target);

			const connection = moduleGraph.getConnection(dependency);
			expect(connection).toBeDefined();
			expect(/** @type {{ module: Module }} */ (connection).module).toBe(
				target
			);
		});
	});

	describe("_flushUnassignedConnections", () => {
		it("makes connections resolvable by dependency without a parent module", () => {
			const moduleGraph = new ModuleGraph();
			const origin = createModule();
			const target = createModule();
			const dependency = new Dependency();
			moduleGraph.setResolvedModule(origin, dependency, target);

			// without a parent module the lazy flush in getConnection cannot run
			moduleGraph._flushUnassignedConnections(origin);

			const connection =
				/** @type {import("../lib/ModuleGraphConnection")} */
				(moduleGraph.getConnection(dependency));
			expect(connection).toBeDefined();
			expect(connection.module).toBe(target);
		});

		it("without the flush the connection is not found", () => {
			const moduleGraph = new ModuleGraph();
			const origin = createModule();
			const target = createModule();
			const dependency = new Dependency();
			moduleGraph.setResolvedModule(origin, dependency, target);

			expect(moduleGraph.getConnection(dependency)).toBeUndefined();
		});
	});

	describe("_removeModule", () => {
		it("detaches incoming and outgoing connections of the removed module", () => {
			const moduleGraph = new ModuleGraph();
			const origin = createModule();
			const removed = createModule();
			const target = createModule();
			moduleGraph.setResolvedModule(origin, new Dependency(), removed);
			moduleGraph.setResolvedModule(removed, new Dependency(), target);

			moduleGraph._removeModule(removed);

			expect([...moduleGraph.getOutgoingConnections(origin)]).toHaveLength(0);
			expect([...moduleGraph.getIncomingConnections(target)]).toHaveLength(0);
		});
	});

	describe("mutation journal", () => {
		it("reverses moved connections back to the original module", () => {
			const moduleGraph = new ModuleGraph();
			const origin = createModule();
			const replacement = createModule();
			const incomingSource = createModule();
			const target = createModule();
			moduleGraph.setResolvedModule(origin, new Dependency(), target);
			moduleGraph.setResolvedModule(incomingSource, new Dependency(), origin);

			moduleGraph._startMutationJournal();
			moduleGraph.moveModuleConnections(origin, replacement, () => true);

			expect([...moduleGraph.getOutgoingConnections(replacement)]).toHaveLength(
				1
			);
			expect([...moduleGraph.getIncomingConnections(replacement)]).toHaveLength(
				1
			);

			moduleGraph._restoreFromMutationJournal();

			const outgoing = [...moduleGraph.getOutgoingConnections(origin)];
			expect(outgoing).toHaveLength(1);
			expect(outgoing[0].originModule).toBe(origin);
			expect(outgoing[0].module).toBe(target);
			const incoming = [...moduleGraph.getIncomingConnections(origin)];
			expect(incoming).toHaveLength(1);
			expect(incoming[0].module).toBe(origin);
			expect([...moduleGraph.getOutgoingConnections(replacement)]).toHaveLength(
				0
			);
			expect([...moduleGraph.getIncomingConnections(replacement)]).toHaveLength(
				0
			);
		});

		it("removes copied connections from the copy target and its modules", () => {
			const moduleGraph = new ModuleGraph();
			const origin = createModule();
			const replacement = createModule();
			const target = createModule();
			moduleGraph.setResolvedModule(origin, new Dependency(), target);

			moduleGraph._startMutationJournal();
			moduleGraph.copyOutgoingModuleConnections(
				origin,
				replacement,
				() => true
			);

			expect([...moduleGraph.getOutgoingConnections(replacement)]).toHaveLength(
				1
			);
			expect([...moduleGraph.getIncomingConnections(target)]).toHaveLength(2);

			moduleGraph._restoreFromMutationJournal();

			expect([...moduleGraph.getOutgoingConnections(replacement)]).toHaveLength(
				0
			);
			expect([...moduleGraph.getIncomingConnections(target)]).toHaveLength(1);
			expect([...moduleGraph.getOutgoingConnections(origin)]).toHaveLength(1);
		});

		it("does nothing when no journal was started", () => {
			const moduleGraph = new ModuleGraph();
			const origin = createModule();
			const target = createModule();
			moduleGraph.setResolvedModule(origin, new Dependency(), target);

			moduleGraph._restoreFromMutationJournal();

			expect([...moduleGraph.getOutgoingConnections(origin)]).toHaveLength(1);
		});
	});
});
