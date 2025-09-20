import type { Data } from "ejs";
import type { GirModule } from "../gir-module.ts";
import type { OptionsGeneration } from "./options-generation.ts";

export interface TemplateData extends Data, Partial<OptionsGeneration> {
	girModule?: GirModule;
	importName?: string;
}
