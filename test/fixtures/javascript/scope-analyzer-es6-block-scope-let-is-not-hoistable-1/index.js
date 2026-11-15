
				var i = 42; (1)
				{
					i;  // (2) ReferenceError at runtime.
					let i = 20;  // (2)
					i;  // (2)
				}
			