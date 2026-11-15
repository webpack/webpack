
				async function fn() {
					{
						await using i = 42;
						i;
					}
				}
			