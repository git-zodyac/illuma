# 🧪 Testkit

The Illuma testkit provides framework-agnostic utilities for testing components that use dependency injection. It makes it easy to set up isolated test environments with controlled dependencies.

## 📦 Installation

The testkit is included with Illuma. Import it from the `/testkit` subpath:

```typescript
import { createTestFactory } from '@zodyac/illuma/testkit';
```

## 🎯 Core Concepts

The testkit revolves around the **test factory** pattern. A test factory creates isolated instances of your services with their dependencies properly injected, making it easy to test them in isolation.

### `createTestFactory(config)`

Creates a test factory function that sets up a clean DI container for each test.

**Parameters:**
- `config.target` - The token or class to be tested
- `config.providers?` - Optional provider set (created with `createProviderSet`) to include in the test container

**Returns:** A `TestFactoryFn<T>` that creates a `Spectator<T>` when called

### `Spectator<T>`

The spectator object provides access to your tested instance and the ability to inject additional dependencies:

- `instance` - The instantiated service/class being tested
- `nodeInject(token, options?)` - Inject dependencies from the test container

## 🚀 Quick Start

### Basic Service Testing

```typescript
import { NodeInjectable } from '@zodyac/illuma';
import { createTestFactory } from '@zodyac/illuma/testkit';

@NodeInjectable()
class UserService {
  getUser() {
    return { id: 1, name: 'John Doe' };
  }
}

describe('UserService', () => {
  const createTest = createTestFactory({ target: UserService });

  it('should get user', () => {
    const { instance } = createTest();
    
    expect(instance.getUser()).toEqual({ id: 1, name: 'John Doe' });
  });
});
```

### Testing with Dependencies

```typescript
import { NodeInjectable, nodeInject, createProviderSet } from '@zodyac/illuma';
import { createTestFactory } from '@zodyac/illuma/testkit';

@NodeInjectable()
class DatabaseService {
  query(sql: string) {
    return [{ id: 1, name: 'Alice' }];
  }
}

@NodeInjectable()
class UserRepository {
  private db = nodeInject(DatabaseService);

  findAll() {
    return this.db.query('SELECT * FROM users');
  }
}

describe('UserRepository', () => {
  const createTest = createTestFactory({
    target: UserRepository,
    providers: createProviderSet(DatabaseService),
  });

  it('should find all users', () => {
    const { instance } = createTest();
    
    expect(instance.findAll()).toHaveLength(1);
  });
});
```

### Mocking Dependencies

Replace real dependencies with mocks or stubs:

```typescript
import { NodeInjectable, nodeInject, createProviderSet } from '@zodyac/illuma';
import { createTestFactory } from '@zodyac/illuma/testkit';

@NodeInjectable()
class EmailService {
  send(to: string, message: string) {
    // Real implementation would send email
    console.log(`Sending to ${to}: ${message}`);
  }
}

class MockEmailService {
  sent: Array<{ to: string; message: string }> = [];
  
  send(to: string, message: string) {
    this.sent.push({ to, message });
  }
}

@NodeInjectable()
class NotificationService {
  private email = nodeInject(EmailService);

  notifyUser(userId: string, message: string) {
    this.email.send(`user-${userId}@example.com`, message);
  }
}

describe('NotificationService', () => {
  const createTest = createTestFactory({
    target: NotificationService,
    providers: createProviderSet({
      provide: EmailService,
      useClass: MockEmailService,
    }),
  });

  it('should send notification via email', () => {
    const { instance, nodeInject } = createTest();
    const mockEmail = nodeInject(EmailService) as MockEmailService;
    
    instance.notifyUser('123', 'Hello!');
    
    expect(mockEmail.sent).toHaveLength(1);
    expect(mockEmail.sent[0]).toEqual({
      to: 'user-123@example.com',
      message: 'Hello!',
    });
  });
});
```

### Testing with Tokens

```typescript
import {
  createProviderSet
  NodeToken,
  NodeInjectable,
  nodeInject,
} from '@zodyac/illuma';
import { createTestFactory } from '@zodyac/illuma/testkit';

const API_URL = new NodeToken<string>('API_URL');
const API_KEY = new NodeToken<string>('API_KEY');

@NodeInjectable()
class ApiClient {
  private url = nodeInject(API_URL);
  private key = nodeInject(API_KEY);

  getEndpoint() {
    return `${this.url}?key=${this.key}`;
  }
}

describe('ApiClient', () => {
  const createTest = createTestFactory({
    target: ApiClient,
    providers: createProviderSet(
      { provide: API_URL, value: 'https://api.test.com' },
      { provide: API_KEY, value: 'test-key-123' },
    ),
  });

  it('should construct endpoint URL', () => {
    const { instance } = createTest();
    
    expect(instance.getEndpoint()).toBe('https://api.test.com?key=test-key-123');
  });
});
```

### Testing Multi-Token Dependencies

```typescript
import {
  createProviderSet,
  MultiNodeToken,
  NodeInjectable,
  nodeInject
} from '@zodyac/illuma';
import { createTestFactory } from '@zodyac/illuma/testkit';

interface Plugin {
  name: string;
  execute(): void;
}

const PLUGIN = new MultiNodeToken<Plugin>('PLUGIN');

@NodeInjectable()
class LoggerPlugin implements Plugin {
  name = 'logger';
  execute() {
    console.log('Logging...');
  }
}

@NodeInjectable()
class CachePlugin implements Plugin {
  name = 'cache';
  execute() {
    console.log('Caching...');
  }
}

@NodeInjectable()
class PluginManager {
  private plugins = nodeInject(PLUGIN);

  runAll() {
    this.plugins.forEach(p => p.execute());
  }

  getPluginNames() {
    return this.plugins.map(p => p.name);
  }
}

describe('PluginManager', () => {
  const createTest = createTestFactory({
    target: PluginManager,
    providers: createProviderSet(
      { provide: PLUGIN, alias: LoggerPlugin },
      { provide: PLUGIN, alias: CachePlugin },
    ),
  });

  it('should have all plugins', () => {
    const { instance } = createTest();
    
    expect(instance.getPluginNames()).toEqual(['logger', 'cache']);
  });
});
```

### Optional Dependencies

Test services with optional dependencies:

```typescript
import {
  createProviderSet,
  NodeToken,
  NodeInjectable,
  nodeInject
} from '@zodyac/illuma';
import { createTestFactory } from '@zodyac/illuma/testkit';

const LOGGER = new NodeToken<{ log(msg: string): void }>('LOGGER');

@NodeInjectable()
class Service {
  private logger = nodeInject(LOGGER, { optional: true });

  doWork() {
    this.logger?.log('Working...');
    return 'done';
  }
}

describe('Service', () => {
  it('should work without optional logger', () => {
    const createTest = createTestFactory({ target: Service });
    const { instance, nodeInject } = createTest();
    
    expect(nodeInject(LOGGER, { optional: true })).toBeNull();
    expect(instance.doWork()).toBe('done');
  });

  it('should use logger when provided', () => {
    const mockLogger = { log: jest.fn() };
    const createTest = createTestFactory({
      target: Service,
      providers: createProviderSet({ provide: LOGGER, value: mockLogger }),
    });
    
    const { instance } = createTest();
    instance.doWork();
    
    expect(mockLogger.log).toHaveBeenCalledWith('Working...');
  });
});
```

## 🔧 Using with Different Test Frameworks

While the examples above use Jest, the testkit works with any JavaScript testing framework:

### Vitest

```typescript
import { describe, it, expect } from 'vitest';
import { createTestFactory } from '@zodyac/illuma/testkit';

describe('MyService', () => {
  const createTest = createTestFactory({ target: MyService });

  it('should work', () => {
    const { instance } = createTest();
    expect(instance.getValue()).toBe('expected');
  });
});
```

### Mocha

```typescript
import { expect } from 'chai';
import { createTestFactory } from '@zodyac/illuma/testkit';

describe('MyService', () => {
  const createTest = createTestFactory({ target: MyService });

  it('should work', () => {
    const { instance } = createTest();
    expect(instance.getValue()).to.equal('expected');
  });
});
```

### Node Test Runner

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createTestFactory } from '@zodyac/illuma/testkit';

describe('MyService', () => {
  const createTest = createTestFactory({ target: MyService });

  it('should work', () => {
    const { instance } = createTest();
    assert.strictEqual(instance.getValue(), 'expected');
  });
});
```

## 📚 API Reference

### `createTestFactory<T>(config: iTestFactoryConfig<T>): TestFactoryFn<T>`

Creates a test factory for the specified target.

**Type Parameters:**
- `T` - The type of the service/class being tested

**Parameters:**
- `config.target: Token<T>` - The class or token to instantiate
- `config.providers?: iNodeProviderSet` - Optional providers to include

**Returns:** `TestFactoryFn<T>` - A function that creates test instances

### `TestFactoryFn<T>`

A function that creates a new test instance with a clean DI container.

**Returns:** `iSpectator<T>` - The spectator object

### `iSpectator<T>`

The object returned by test factory functions.

**Properties:**
- `instance: T` - The instantiated service being tested
- `nodeInject: NodeInjectFn` - Function to inject additional dependencies

**Methods:**
- `nodeInject<U>(token: Token<U>, options?: { optional?: boolean }): U` - Inject a dependency from the test container

## 💡 Best Practices

1. **Create factory once per test suite**: Define `createTest` outside of individual test cases for better performance
2. **Call factory in each test**: Call the factory function inside each test to ensure isolation
3. **Use mocks for external dependencies**: Replace external services (HTTP, database, etc.) with mocks
4. **Test one thing at a time**: Focus each test on a single behavior
5. **Leverage TypeScript**: Use types to ensure test correctness at compile time

## 🔗 See Also

- [Main Documentation](../README.md)
- [API Reference](./API.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
