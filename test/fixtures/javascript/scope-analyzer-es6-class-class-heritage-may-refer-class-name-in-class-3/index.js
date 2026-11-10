
				let foo;
				class C extends (foo = C, class {}) {}
				new C();
			