import type {
	GirModule,
	IntrospectedBaseClass,
	IntrospectedClass,
	IntrospectedRecord,
	OptionsGeneration,
} from "@ts-for-gir/lib";
import ts, { factory } from "typescript";
import { ModuleGeneratorBase } from "./module-generator-base";
import type TemplateProcessor from "./template-processor";
import * as utils from "./utils.ts";

export class GObjectClassGenerator extends ModuleGeneratorBase {
	statements: ts.Statement[];
	classImports: Set<string>;

	constructor(module: GirModule, options: OptionsGeneration, moduleTemplateProcessor: TemplateProcessor) {
		super(module, options, GObjectClassGenerator.name, "classes", moduleTemplateProcessor);
		this.statements = [];
		this.classImports = new Set();
	}

	protected override extends(node: IntrospectedBaseClass) {
		const { module, options } = this;

		if (node.superType) {
			const superType = node.superType.resolveIdentifier(module, options);

			let generated = superType?.generate(this);

			if (generated && node.hasGObjectParent()) {
				if (ts.isPropertyAccessExpression(generated.expression)) {
					if (superType?.namespace === module.namespace) {
						generated = factory.createExpressionWithTypeArguments(generated.expression.name, generated.typeArguments);
					} else if (superType?.namespace) {
						this.classImports.add(superType.namespace);
						generated = factory.createExpressionWithTypeArguments(
							utils.createExpression(`${superType.namespace}Classes`, generated.expression.name),
							generated.typeArguments,
						);
					}
				}
			}

			if (!generated) {
				this.log.warn(
					`Unable to resolve type: ${node.superType.name} from ${node.superType.namespace} in ${node.namespace.namespace} ${node.namespace.version}, falling back to GObject.Object`,
				);
				generated = utils.createExpressionWithTypeArguments(utils.createExpression("GObject", "Object"));
			}

			return generated;
		}
	}

	generateClass(girClass: IntrospectedClass | IntrospectedRecord) {
		const generated = this.generateClassBase(girClass);
		this.statements.push(generated);
		return generated;
	}

	get targetFile() {
		return `${this.module.importName}-classes.d.ts`;
	}

	async exportModuleTS(referencedFiles: ts.FileReference[]): Promise<void> {
		const { module } = this;
		if (!module) {
			this.log.error("Failed to generate gir module");
			return;
		}

		const importStatements: ts.Statement[] = [
			factory.createImportDeclaration(
				undefined,
				factory.createImportClause(ts.SyntaxKind.TypeKeyword, factory.createIdentifier(module.namespace), undefined),
				factory.createStringLiteral(`./${this.module.importName}.d.ts`),
			),
		];

		for (const dependency of module.transitiveDependencies) {
			this.addModuleImport(dependency, importStatements);

			if (this.classImports.has(dependency.namespace)) {
				importStatements.push(
					factory.createImportDeclaration(
						undefined,
						factory.createImportClause(
							undefined,
							undefined,
							factory.createNamedImports([
								factory.createImportSpecifier(
									true,
									undefined,
									factory.createIdentifier(`${dependency.namespace}Classes`),
								),
							]),
						),
						factory.createStringLiteral(`${dependency.importPath}/${dependency.importName}`),
					),
				);
			}
		}

		const moduleStatement = utils.createModule(this.namespace, {
			declare: true,
			namespace: true,
			statements: this.statements,
		});

		const moduleExport = factory.createExportDefault(moduleStatement.name);

		// Output is always an array now
		const text = this.printStatements([...importStatements, moduleStatement, moduleExport], referencedFiles);

		this.statements = [];
		this.classImports.clear();

		if (this.options.outdir) {
			await this.moduleTemplateProcessor.write(text, this.options.outdir, this.targetFile);
		} else {
			this.log.log(text);
		}
	}
}
