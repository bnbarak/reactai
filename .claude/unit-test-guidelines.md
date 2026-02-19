# Unit Test Guidelines

## Core Principles

### 1. Strict AAA Pattern
Every test must follow Arrange-Act-Assert with clear visual separation.

```java
@Test
void getUserById_existingUser() {
  User user = TestUtil.createUser("123", "Alice");
  userRepository.save(user);

  User result = userService.getUserById("123");

  assertEquals("Alice", result.getName());
}
```

### 2. Two-Space Indentation
Use exactly 2 spaces for indentation. Never use tabs.

```java
@Test
void processOrder_validOrder() {
  Order order = TestUtil.createOrder();

  OrderResult result = orderService.process(order);

  assertTrue(result.isSuccess());
}
```

### 3. One Concept Per Test
Each test validates exactly one behavior. Split complex scenarios into multiple tests.

```java
@Test
void createUser_setsCreatedTimestamp() {
  UserRequest request = TestUtil.createUserRequest("Bob");

  User user = userService.createUser(request);

  assertNotNull(user.getCreatedAt());
}

@Test
void createUser_setsActiveStatus() {
  UserRequest request = TestUtil.createUserRequest("Bob");

  User user = userService.createUser(request);

  assertTrue(user.isActive());
}
```

### 4. No Comments
Tests should be self-documenting through clear naming and structure.

```java
@Test
void login_invalidPassword_throwsException() {
  User user = TestUtil.createUser("user@test.com", "correctPass");
  LoginRequest request = TestUtil.createLoginRequest("user@test.com", "wrongPass");

  assertThrows(AuthenticationException.class, () -> authService.login(request));
}
```

### 5. Use TestUtil for Data Setup
Never inline test data creation. Always use TestUtil methods.

```java
@Test
void calculateTotal_multipleItems() {
  Cart cart = TestUtil.createCartWithItems(
    TestUtil.createItem("Item1", 10.00),
    TestUtil.createItem("Item2", 20.00)
  );

  BigDecimal total = cartService.calculateTotal(cart);

  assertEquals(new BigDecimal("30.00"), total);
}

static class TestUtil {

  static Cart createCartWithItems(Item... items) {
    Cart cart = new Cart();
    for (Item item : items) {
      cart.addItem(item);
    }
    return cart;
  }

  static Item createItem(String name, double price) {
    return Item.builder()
      .name(name)
      .price(BigDecimal.valueOf(price))
      .build();
  }
}
```

## Test Naming Convention

Pattern: `methodName_condition_expectedBehavior`

```java
@Test
void processPayment_insufficientFunds_throwsException() {}

@Test
void processPayment_validAmount_returnsConfirmation() {}

@Test
void getUserById_userNotFound_throwsException() {}

@Test
void getUserById_existingUser_returnsUser() {}
```

## TestUtil Pattern

Place TestUtil as a nested static class in the test file.

```java
class UserServiceTest {

  @Test
  void createUser_validRequest() {
    UserRequest request = TestUtil.createUserRequest("alice@test.com");

    User user = userService.createUser(request);

    assertEquals("alice@test.com", user.getEmail());
  }

  static class TestUtil {

    static UserRequest createUserRequest(String email) {
      return UserRequest.builder()
        .email(email)
        .name("Test User")
        .build();
    }

    static User createUser(String id, String email) {
      return User.builder()
        .id(id)
        .email(email)
        .active(true)
        .createdAt(LocalDateTime.now())
        .build();
    }
  }
}
```

## AAA Structure

### Arrange
Set up test data and preconditions. Leave blank line after.

```java
User user = TestUtil.createUser("123", "test@test.com");
userRepository.save(user);
```

### Act
Execute the method under test. Leave blank line before and after.

```java
User result = userService.getUserById("123");
```

### Assert
Verify the outcome. No blank line before.

```java
assertEquals("test@test.com", result.getEmail());
assertTrue(result.isActive());
```

## Multiple Assertions

When testing multiple properties of the same concept, group them together.

```java
@Test
void createOrder_setsInitialState() {
  OrderRequest request = TestUtil.createOrderRequest();

  Order order = orderService.createOrder(request);

  assertEquals(OrderStatus.PENDING, order.getStatus());
  assertNotNull(order.getCreatedAt());
  assertNull(order.getCompletedAt());
}
```

## Exception Testing

Use assertThrows for exception scenarios.

```java
@Test
void transfer_insufficientBalance_throwsException() {
  Account account = TestUtil.createAccount("123", 100.00);
  TransferRequest request = TestUtil.createTransferRequest(200.00);

  assertThrows(InsufficientBalanceException.class,
    () -> accountService.transfer(account, request));
}
```

## Parameterized Tests (When Appropriate)

For testing same logic with different inputs.

```java
@ParameterizedTest
@CsvSource({
  "0, false",
  "17, false",
  "18, true",
  "65, true"
})
void isAdult_variousAges(int age, boolean expected) {
  User user = TestUtil.createUserWithAge(age);

  boolean result = userService.isAdult(user);

  assertEquals(expected, result);
}
```

## Example: Complete Test Class

```java
class OrderServiceTest {

  private OrderService orderService;
  private OrderRepository orderRepository;

  @BeforeEach
  void setUp() {
    orderRepository = mock(OrderRepository.class);
    orderService = new OrderService(orderRepository);
  }

  @Test
  void createOrder_validRequest() {
    OrderRequest request = TestUtil.createOrderRequest();

    Order order = orderService.createOrder(request);

    assertEquals(OrderStatus.PENDING, order.getStatus());
    assertNotNull(order.getId());
  }

  @Test
  void createOrder_emptyCart_throwsException() {
    OrderRequest request = TestUtil.createEmptyOrderRequest();

    assertThrows(EmptyCartException.class,
      () -> orderService.createOrder(request));
  }

  @Test
  void processOrder_validOrder() {
    Order order = TestUtil.createPendingOrder();

    Order result = orderService.processOrder(order);

    assertEquals(OrderStatus.PROCESSING, result.getStatus());
  }

  static class TestUtil {

    static OrderRequest createOrderRequest() {
      return OrderRequest.builder()
        .customerId("123")
        .items(List.of(createOrderItem()))
        .build();
    }

    static OrderRequest createEmptyOrderRequest() {
      return OrderRequest.builder()
        .customerId("123")
        .items(List.of())
        .build();
    }

    static Order createPendingOrder() {
      return Order.builder()
        .id("ORDER-123")
        .status(OrderStatus.PENDING)
        .createdAt(LocalDateTime.now())
        .build();
    }

    static OrderItem createOrderItem() {
      return OrderItem.builder()
        .productId("PROD-1")
        .quantity(1)
        .price(BigDecimal.valueOf(29.99))
        .build();
    }
  }
}
```

## Summary Checklist

- [ ] Follow strict AAA pattern with blank lines
- [ ] Use exactly 2 spaces for indentation
- [ ] One concept per test
- [ ] No comments in test code
- [ ] All test data created via TestUtil
- [ ] Test names follow methodName_condition_expectedBehavior
- [ ] TestUtil is nested static class
- [ ] Clear separation between Arrange, Act, Assert
- [ ] Assertions verify one logical concept
