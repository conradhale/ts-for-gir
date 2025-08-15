import { build } from "esbuild";

await build({
	entryPoints: ["src/start.ts"],
	outfile: "bin/ts-for-gir.js",
	bundle: true,
	platform: "node",
	format: "esm",
	external: [
		"@ts-for-gir/templates",
		"@inquirer/prompts",
		"ejs",
		"cosmiconfig",
		"glob",
		"inquirer",
		"prettier",
		"colorette",
		"yargs",
	],
});
