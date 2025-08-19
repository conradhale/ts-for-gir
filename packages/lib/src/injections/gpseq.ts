import type { IntrospectedInterface } from "../gir/introspected-classes.ts";
import type { IntrospectedNamespace } from "../gir/namespace.ts";
import { ModuleTypeIdentifier } from "../gir.ts";

export default {
	namespace: "Gpseq",
	version: "1.0",
	modifier(namespace: IntrospectedNamespace) {
		// Fix the namespace collision between global FlatMapFunc and Result.FlatMapFunc
		// The issue is that Gpseq.ResultFlatMapFunc should resolve to Result.FlatMapFunc
		// but instead resolves to the global FlatMapFunc

		try {
			const Result = namespace.getClass("Result") as IntrospectedInterface | null;
			if (!Result) return;

			// Find the virtual method in Result's members that uses the wrong FlatMapFunc
			const resultVirtualMethods = Result.members.filter((m) => m.name === "vfunc_flat_map");

			if (resultVirtualMethods.length > 0) {
				for (const vfunc of resultVirtualMethods) {
					// Find the 'func' parameter that should use Result.FlatMapFunc instead of global FlatMapFunc
					const funcParam = vfunc.parameters.find((p) => p.name === "func");
					if (funcParam) {
						// Create a new ModuleTypeIdentifier that points to Result.FlatMapFunc
						const resultFlatMapFunc = new ModuleTypeIdentifier("FlatMapFunc", "Result", "Gpseq");
						// Replace the parameter's type
						Object.defineProperty(funcParam, "type", {
							value: resultFlatMapFunc,
							writable: true,
							enumerable: true,
							configurable: true,
						});
					}
				}
			}

			// Also fix vfunc_map
			const resultMapMethods = Result.members.filter((m) => m.name === "vfunc_map");

			if (resultMapMethods.length > 0) {
				for (const vfunc of resultMapMethods) {
					const funcParam = vfunc.parameters.find((p) => p.name === "func");
					if (funcParam) {
						// Create a new ModuleTypeIdentifier that points to Result.MapFunc
						const resultMapFunc = new ModuleTypeIdentifier("MapFunc", "Result", "Gpseq");
						// Replace the parameter's type
						Object.defineProperty(funcParam, "type", {
							value: resultMapFunc,
							writable: true,
							enumerable: true,
							configurable: true,
						});
					}
				}
			}
		} catch (error) {
			// Ignore errors - the class might not exist in all versions
			console.warn("Gpseq injection failed:", error);
		}
	},
};
