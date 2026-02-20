# OneAPI Project

This is a Java and JavaScript workspace project.

## React Component Convention

All React components must use an interface for props and `export const` arrow function syntax:

```tsx
interface MyComp {
  title: string
  count?: number
}

export const MyComp = ({ title, count }: MyComp) => {
  return <div>{title}</div>
}
```

- Props interface name matches the component name
- No-props components: `export const MyComp = () => { ... }`
- Inner (non-exported) components follow the same rule: `const MyInner = ({ ... }: MyInnerProps) => { ... }`
- Utility functions and event handlers inside a component body are exempt

## Error Handling Philosophy

**Fail fast, fail loud - tight system integrity!**

1. **No defensive try/catch blocks**: Only use try/catch when meaningful and at the top of the call stack (entry points, controllers, top-level listeners). Let exceptions propagate - don't catch just to log and continue.

2. **Never swallow exceptions**: Do NOT catch exceptions just to log an error and continue silently. If something fails, the system should fail. If queue registration fails, app startup should fail. If a required service is unavailable, fail immediately.

3. **Throw exceptions instead of returning null**: Prefer `throw new IllegalStateException()` over `return null`. Don't force callers to check for null everywhere. Make the failure explicit and immediate.

4. **Use @NonNull, trust validation**: Don't litter code with null checks. Use `@NonNull` annotations and trust them. Validate at system boundaries (API inputs, external data), then trust internal contracts. Prefer builder pattern for optional fields, then create immutable non-null versions.

5. **Example of BAD code**:
   ```java
   try {
     criticalOperation();
   } catch (Exception e) {
     log.error("Failed", e);  // ❌ Swallowed exception!
   }

   public Result process(String id) {
     if (id == null) return null;  // ❌ Returning null!
     Result r = service.get(id);
     if (r == null) return null;   // ❌ Null checks everywhere!
     return r;
   }
   ```

6. **Example of GOOD code**:
   ```java
   // Let it fail - will be caught at entry point
   criticalOperation();

   public Result process(@NonNull String id) {
     return service.get(id)  // Trust @NonNull contract
       .orElseThrow(() -> new IllegalStateException("Result not found: " + id));
   }
   ```
