# Needle DI CLI Example with Decorators

This example demonstrates modern Dependency Injection using Needle DI decorators in a simple GJS CLI application.

## Features

- **Modern Decorators**: Uses `@injectable()` and `inject()` for clean dependency injection
- **Type Safety**: Full TypeScript support with automatic type inference
- **Simple Setup**: No manual token creation or factory functions required
- **CLI Interface**: Easy to run and test without GUI dependencies
- **Command Line Arguments**: Accepts names as arguments for personalized greetings

## How It Works

### 1. Service Definition with Decorators

```typescript
@injectable()
export class LoggerService implements Logger {
    log(msg: string): void {
        console.log(`[Needle] ${msg}`);
    }
}

@injectable()
export class GreeterService implements Greeter {
    constructor(private logger = inject(LoggerService)) {}

    greet(name: string): string {
        const msg = `Hallo, ${name}!`;
        this.logger.log(`greet() -> ${msg}`);
        return msg;
    }
}
```

### 2. Container Usage

```typescript
// Create container (no manual bindings needed!)
const container = new Container();

// Get service with automatically resolved dependencies
const greeter = container.get(GreeterService);
```

## Key Improvements Over Traditional DI

1. **No Token Creation**: Services are automatically registered by the `@injectable()` decorator
2. **No Factory Functions**: Dependencies are resolved automatically via constructor injection
3. **Cleaner Code**: Focus on business logic instead of DI setup
4. **Type Safety**: Full TypeScript inference without manual type annotations

## Running the Example

### Build the example
```bash
yarn run build
```

### Run without arguments (greets "World")
```bash
yarn start
# or
yarn greet
```

### Run with custom name
```bash
yarn greet Alice
# or
gjs -m dist/main.js Alice
```

### Example Output
```
🚀 Needle DI CLI Example Started
=====================================
📝 Greeting requested for: Alice

✅ Result: Hallo, Alice!

🎯 Additional greetings:
   Hallo, Alice!
   Hallo, Bob!
   Hallo, Charlie!

✨ Dependency Injection working perfectly!
   LoggerService was automatically injected into GreeterService
```

## Understanding the DI Flow

1. **Service Registration**: `@injectable()` decorators automatically register services
2. **Dependency Resolution**: `inject(LoggerService)` in constructor tells the container what to inject
3. **Service Retrieval**: `container.get(GreeterService)` resolves all dependencies automatically
4. **Type Safety**: TypeScript ensures all dependencies are correctly typed

This example shows how clean and simple dependency injection can be with modern decorators!
