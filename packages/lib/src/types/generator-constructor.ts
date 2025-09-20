import type { FormatGenerator } from "../generators/generator.ts";
import type { IntrospectedNamespace } from "../gir/namespace.ts";
import type { OptionsGeneration } from "./options-generation.ts";

export type GeneratorConstructor<T> = {
	new (namespace: IntrospectedNamespace, options: OptionsGeneration, ...args: unknown[]): FormatGenerator<T>;
};
