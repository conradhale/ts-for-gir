#!/usr/bin/env gjs -m

// Simple CLI demonstration of Dependency Injection with Ditox
// This example shows how services are automatically resolved and injected
// All DI configuration and CLI application in one file

import { createContainer, injectable, token } from "ditox";

// Define service interfaces
interface Logger {
	log(msg: string): void;
}

interface Greeter {
	greet(name: string): string;
}

// Create tokens for dependency injection
const LOGGER_TOKEN = token<Logger>("LOGGER");
const GREETER_TOKEN = token<Greeter>("GREETER");

// Create and configure the container
const container = createContainer();

// Bind logger service as a simple value
container.bindValue(LOGGER_TOKEN, {
	log: (msg: string) => console.log(`[Ditox] ${msg}`),
});

// Bind greeter service as a factory function with dependency injection
container.bindFactory(
	GREETER_TOKEN,
	injectable(
		(logger: Logger) => ({
			greet: (name: string) => {
				const msg = `Moin, ${name}!`;
				logger.log(`greet() -> ${msg}`);
				return msg;
			},
		}),
		LOGGER_TOKEN,
	),
);

/**
 * Main CLI application demonstrating Dependency Injection with Ditox
 */
class DiCliApp {
	private greeter: Greeter; // Will be resolved from container

	constructor() {
		// Get GreeterService from DI container - dependencies are automatically resolved!
		this.greeter = container.resolve(GREETER_TOKEN);
		console.log("🚀 Ditox DI CLI Example Started");
		console.log("=================================");
	}

	/**
	 * Run the CLI application with command line arguments
	 */
	run(args: string[]): void {
		// Parse command line arguments (skip script name and gjs path)
		const name = args[0] || "World"; // First user argument

		console.log(`📝 Greeting requested for: ${name}`);
		console.log("");

		// Use the injected service
		const greeting = this.greeter.greet(name);

		console.log("✅ Result:", greeting);
		console.log("");

		// Demonstrate multiple greetings
		console.log("🎯 Additional greetings:");
		const names = ["Diana", "Eva", "Felix"];

		for (const person of names) {
			const message = this.greeter.greet(person);
			console.log(`   ${message}`);
		}

		console.log("");
		console.log("✨ Dependency Injection working perfectly!");
		console.log("   LoggerService was automatically injected into GreeterService");
		console.log("   Ditox used functional API with injectable() and bindFactory()");
		console.log("   Services defined as factory functions with explicit dependencies");
	}
}

// Create and run the application
const app = new DiCliApp();

// Handle command line arguments (skip first two: gjs script.js)
app.run(ARGV);
