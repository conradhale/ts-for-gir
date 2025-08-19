import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Package information interface for package.json
 * Each package has its own version and metadata
 */
interface Package {
	version: string;
	name: string;
	description: string;
}

/**
 * Resolves the current package's package.json path
 * Uses import.meta.url for ES Module compatibility
 * Works both in workspace and after publishing
 */
function resolvePackageJson(): string {
	try {
		// Get the directory of the current module
		const currentModulePath = fileURLToPath(import.meta.url);
		const currentDir = dirname(currentModulePath);

		// Go up to the package root (src/ -> package root)
		const packageRoot = join(currentDir, "..");
		const packageJsonPath = join(packageRoot, "package.json");

		return packageJsonPath;
	} catch (error) {
		throw new Error(`Unable to resolve package.json path: ${error instanceof Error ? error.message : "Unknown error"}`);
	}
}

/**
 * Reads and parses the current package's package.json file
 * Contains version and metadata for this specific package
 */
function readPackage(): Package {
	try {
		const packagePath = resolvePackageJson();
		const content = readFileSync(packagePath, "utf-8");
		return JSON.parse(content) as Package;
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		throw new Error(`Failed to read package.json: ${message}`);
	}
}

// Read package information once at module load
export const PACKAGE = readPackage();

/**
 * The current version of the reporter package
 */
export const PACKAGE_VERSION = PACKAGE.version;
