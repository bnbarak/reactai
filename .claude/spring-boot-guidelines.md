# Spring Boot Guidelines

## API Design

### 1. HTTP Methods
Use explicit `@PostMapping` or `@GetMapping` annotations. Never use generic `@RequestMapping`.

```java
// ✅ CORRECT
@GetMapping("users")
@PostMapping("users")

// ❌ WRONG
@RequestMapping(value = "users", method = RequestMethod.GET)
```

### 2. No Leading Slashes in Route Paths
Never use leading slashes in `@GetMapping`, `@PostMapping`, or `@RequestMapping` paths.

```java
// ✅ CORRECT
@GetMapping("users")
@PostMapping("users/{id}")
@RequestMapping("api")

// ❌ WRONG
@GetMapping("/users")
@PostMapping("/users/{id}")
@RequestMapping("/api")
```

### 3. Global API Prefix
Use `server.servlet.context-path=/api` in `application.properties` to prefix all endpoints.

```properties
server.servlet.context-path=/api
```

This means a controller with `@GetMapping("users")` will be accessible at `/api/users`.

### 4. Query Parameters Only
Never use URL path parameters. Always use query parameters with `@RequestParam`.

```java
// ✅ CORRECT
@GetMapping("users")
public User getUser(@RequestParam String id) {
    return userService.getUser(id);
}

// ❌ WRONG
@GetMapping("users/{id}")
public User getUser(@PathVariable String id) {
    return userService.getUser(id);
}
```

## Architecture

### 5. Service Layer for Logic
All business logic must be in service classes. Controllers should only handle HTTP concerns.

```java
// ✅ CORRECT - Controller
@RestController
@RequestMapping("users")
public class UserController {
    private final UserService userService;

    @GetMapping
    public User getUser(@RequestParam String id) {
        return userService.getUser(id);
    }
}

// ✅ CORRECT - Service
@Service
public class UserService {
    public User getUser(String id) {
        // Business logic here
    }
}
```

### 6. Shared Services in Core
Services that are used across multiple servers should be placed in the `core` module.

```
core/
  └── src/main/java/com/oneapi/core/
      └── service/
          └── SharedService.java  // Used by multiple servers
webServer/
  └── src/main/java/com/oneapi/webserver/
      └── service/
          └── WebSpecificService.java  // Only used by webServer
```

### 7. Repository Encapsulation
Repositories should ONLY be injected and used in their corresponding service class. Never inject repositories directly into controllers or other services.

```java
// ✅ CORRECT
@Service
public class UserService {
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getUser(String id) {
        return userRepository.findById(id).orElseThrow();
    }
}

// ❌ WRONG - Repository in controller
@RestController
public class UserController {
    private final UserRepository userRepository;  // NEVER DO THIS
}

// ❌ WRONG - Repository in another service
@Service
public class OrderService {
    private final UserRepository userRepository;  // NEVER DO THIS
    // Use UserService instead
}
```

## Data Transfer Objects (DTOs)

### 8. Lombok for Payloads
Use Lombok annotations for request/response payload classes. Define them as inner classes within the controller.

#### Lombok Annotation Order & Best Practices

**Standard order for Lombok annotations:**
1. Class-level: `@Data` or `@Value` (or builder pattern annotations)
2. Constructor: `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`
3. Field-level: `@NonNull`, `@Default`
4. Visibility: Always explicit (`public`, `private`, etc.)
5. Modifiers: `final` for immutable fields

**Pattern 1: Mutable DTOs (Request/Response objects)**
```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public static class CreateUserRequest {
    @NonNull private String name;
    @NonNull private String email;
    private Integer age;  // Optional field
}
```

**Pattern 2: Immutable DTOs (Preferred for responses)**
```java
@Value
@Builder
public static class UserResponse {
    @NonNull String id;
    @NonNull String name;
    String email;
    @Builder.Default int loginCount = 0;
}
```

**Pattern 3: Domain Models**
```java
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @NonNull private String id;
    @NonNull private String email;
    @Builder.Default private boolean active = true;
    @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
}
```

**Complete Example:**
```java
@RestController
@RequestMapping("users")
public class UserController {
    private final UserService userService;

    @PostMapping
    public CreateUserResponse createUser(@RequestBody CreateUserRequest request) {
        User user = userService.createUser(request.getName(), request.getEmail());
        return new CreateUserResponse(user.getId(), user.getName());
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateUserRequest {
        @NonNull private String name;
        @NonNull private String email;
    }

    @Value
    @Builder
    public static class CreateUserResponse {
        @NonNull String id;
        @NonNull String name;
    }
}
```

## Testing & Maintainability

### 9. Minimize Logic in Spring Context
Keep business logic in plain Java classes (POJOs) that don't depend on Spring. Spring-annotated classes (`@Service`, `@Component`) should be thin orchestration layers.

```java
// ✅ CORRECT - Logic in plain Java class
public class UserValidator {
    public boolean isValidEmail(String email) {
        return email != null && email.contains("@");
    }

    public boolean isValidAge(int age) {
        return age >= 18 && age <= 120;
    }
}

@Service
public class UserService {
    private final UserRepository userRepository;
    private final UserValidator userValidator = new UserValidator();

    public User createUser(String email, int age) {
        if (!userValidator.isValidEmail(email)) {
            throw new IllegalArgumentException("Invalid email");
        }
        if (!userValidator.isValidAge(age)) {
            throw new IllegalArgumentException("Invalid age");
        }
        return userRepository.save(new User(email, age));
    }
}

// ❌ WRONG - All logic in Spring service
@Service
public class UserService {
    private final UserRepository userRepository;

    public User createUser(String email, int age) {
        // All validation logic buried in service
        if (email == null || !email.contains("@")) {
            throw new IllegalArgumentException("Invalid email");
        }
        if (age < 18 || age > 120) {
            throw new IllegalArgumentException("Invalid age");
        }
        return userRepository.save(new User(email, age));
    }
}
```

**Benefits:**
- Plain Java classes are easy to unit test (no Spring context needed)
- Logic can be tested in isolation without mocking
- Faster test execution
- Better separation of concerns

## Code Quality

### 10. Spotless Code Formatting
The project uses Spotless with Google Java Format. Code is automatically formatted during build.

**Run formatting manually:**
```bash
mvn spotless:apply
```

**Check formatting:**
```bash
mvn spotless:check
```

**Configuration:**
- Style: Google Java Format
- Automatic formatting on `mvn install`
- Validation during `mvn verify`

## Summary Checklist

- [ ] Use `@GetMapping` or `@PostMapping` explicitly
- [ ] No leading slashes in route paths
- [ ] Set `server.servlet.context-path=/api` in properties
- [ ] Use `@RequestParam` only, never `@PathVariable`
- [ ] Business logic in service classes
- [ ] Shared services in `core` module
- [ ] Repositories only used in their corresponding service
- [ ] Lombok DTOs as inner classes in controllers
- [ ] Follow Lombok annotation order: class-level → constructors → field-level
- [ ] Use `@Value` + `@Builder` for immutable DTOs, `@Data` for mutable
- [ ] Always use explicit visibility modifiers (`private`, `public`)
- [ ] Mark required fields with `@NonNull`
- [ ] Use `@Builder.Default` for default values
- [ ] Minimize logic in Spring-annotated classes, prefer POJOs
- [ ] Run `mvn spotless:apply` before committing
