# Working with Queue Infrastructure

## Philosophy

Our queue system is built on three core principles:

1. **Fail fast, fail loud** - No silent failures, no defensive coding, tight system integrity
2. **Non-blocking at scale** - Handle thousands of concurrent workflows without blocking threads
3. **Clean imperative code** - Workflows read like synchronous code while being fully async

## Technology Stack

### Rqueue (Spring Boot + Redis)

**Why Rqueue:**
- Native Spring Boot integration
- Redis-backed for reliability and visibility
- Built-in retry and dead letter queue support
- Message metadata tracking for status queries

**Key limitation discovered:** Rqueue does not support generic classes for serialization. This drove our `BaseTaskData` inheritance pattern.

### Virtual Threads (Java 21+)

**Why Virtual Threads:**
- 10,000+ concurrent workflows use only ~10 OS threads
- Write imperative workflow code that looks synchronous
- `Thread.sleep()` suspends virtual thread without blocking OS thread
- No callback hell, no reactive complexity

**Trade-off:** Requires Java 21+, but the ergonomics and scalability are worth it.

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│  API Gateway / Web Server                   │
│  - Receives requests                        │
│  - Dispatches tasks to queue                │
│  - Returns TaskHandle immediately           │
└──────────────────┬──────────────────────────┘
                   │
                   ↓ (enqueue)
┌─────────────────────────────────────────────┐
│  Redis (Rqueue)                             │
│  - Task message queue                       │
│  - Message metadata                         │
│  - Retry/DLQ management                     │
└──────────────────┬──────────────────────────┘
                   │
                   ↓ (consume)
┌─────────────────────────────────────────────┐
│  Worker Pool (Virtual Threads)              │
│  - Listeners consume messages               │
│  - Can wait for subtasks (non-blocking)     │
│  - Process and save results                 │
└──────────────────┬──────────────────────────┘
                   │
                   ↓ (persist)
┌─────────────────────────────────────────────┐
│  PostgreSQL                                 │
│  - TaskExecution records                    │
│  - Result data                              │
│  - Audit trail                              │
└─────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. BaseTaskData Pattern (Not Generics)

**Problem:** Rqueue cannot serialize generic classes like `TaskWrapper<T>`.

**Solution:** Abstract base class with concrete implementations.

```java
// Base class for all task data
@Data
@SuperBuilder(toBuilder = true)
@NoArgsConstructor
public abstract class BaseTaskData {
  private String taskId;
  private String workflowId;
  private String parentTaskId;
  private String apiKey;
  private String orgId;
  private Date timestamp;  // Date, not Instant!
}

// Concrete implementation
@Data
@EqualsAndHashCode(callSuper = true)
@SuperBuilder(toBuilder = true)
@NoArgsConstructor
public class ProcessOrderTaskData extends BaseTaskData {
  private String orderId;
  private BigDecimal amount;
}
```

**Why `Date` instead of `Instant`:** Rqueue cannot serialize Java 8 `Instant` even with `JavaTimeModule` registered.

**Why `@SuperBuilder` + `@NoArgsConstructor`:** Rqueue requires no-arg constructor for deserialization, SuperBuilder enables builder pattern in subclasses.

**Critical:** Never add `@AllArgsConstructor` - it breaks rqueue deserialization.

### 2. Dual Identifiers (taskId vs rqueueMessageId)

**Why two IDs:**
- `taskId` - Application-level identifier, set by us, returned to client
- `rqueueMessageId` - Rqueue's internal message ID, needed for status queries

**The dance:**
```java
// 1. Save TaskExecution with taskId (no rqueue ID yet)
taskExecution = TaskExecution.builder().taskId(taskId).build();
taskExecutionRepository.save(taskExecution);

// 2. Enqueue to rqueue - returns rqueue's message ID
String rqueueMessageId = rqueueEnqueuer.enqueue(queueName, taskData);

// 3. Update TaskExecution with rqueue message ID
taskExecution.setRqueueMessageId(rqueueMessageId);
taskExecutionRepository.save(taskExecution);
```

**Why save twice:** Rqueue message ID only exists after enqueue, but we need the SQL record before enqueue for atomicity.

### 3. Virtual Thread Executor for Listeners

**Configuration:**
```java
@Bean(name = "rqueueExecutor")
public Executor rqueueExecutor() {
  return Executors.newVirtualThreadPerTaskExecutor();
}
```

**Usage in listener:**
```java
@RqueueListener(value = "queue-name", executor = "rqueueExecutor")
public void processTask(TaskData data) throws InterruptedException {
  // This runs in a virtual thread
  // Can use workflowService.waitFor() without blocking OS threads
}
```

**Key insight:** Queue registration is automatic from `@RqueueListener` annotations. No manual registration needed.

### 4. Error Handling Philosophy

**Never swallow exceptions:**
```java
// BAD - swallows exception
try {
  registerQueues();
} catch (Exception e) {
  log.error("Failed", e);  // App continues silently!
}

// GOOD - let it fail
registerQueues();  // If this fails, app startup fails
```

**Throw instead of returning null:**
```java
// BAD - forces null checks everywhere
public MessageStatus getStatus(String taskId) {
  if (task.getRqueueMessageId() == null) {
    log.warn("Missing ID");
    return null;
  }
  return status;
}

// GOOD - fail fast
public MessageStatus getStatus(String taskId) {
  if (task.getRqueueMessageId() == null) {
    throw new IllegalStateException(
      "Task missing rqueue message ID - data integrity issue: " + taskId);
  }
  return status;
}
```

**Trust `@NonNull` annotations** - validate at boundaries, trust internally.

## Common Patterns

### Pattern 1: Simple Task Dispatch

```java
@Service
public class OrderService {
  private final QueueService queueService;

  public TaskHandle processOrder(OrderRequest request) {
    ProcessOrderTaskData taskData = ProcessOrderTaskData.builder()
      .workflowId(UUID.randomUUID().toString())
      .orderId(request.getOrderId())
      .amount(request.getAmount())
      .build();

    return queueService.dispatch(QueueName.PROCESS_ORDER, taskData);
  }
}
```

**Key points:**
- Generate workflowId for grouping related tasks
- QueueService automatically enriches with apiKey, orgId, taskId
- Returns TaskHandle immediately (non-blocking)

### Pattern 2: Task Listener

```java
@Component
@Slf4j
public class ProcessOrderListener extends BaseQueueListener<ProcessOrderTaskData, OrderResult> {

  @RqueueListener(value = "process-order", executor = "rqueueExecutor", numRetries = "2")
  @Transactional
  public void listen(ProcessOrderTaskData taskData) {
    handleMessage(taskData);
  }

  @Override
  protected OrderResult processMessage(ProcessOrderTaskData taskData, String taskId) {
    log.info("Processing order: {}", taskData.getOrderId());

    // Your business logic here
    validateOrder(taskData);
    chargePayment(taskData);
    createShipment(taskData);

    return new OrderResult(taskData.getOrderId(), OrderStatus.COMPLETED);
  }

  @Override
  protected String getQueueName() {
    return "process-order";
  }

  @Override
  protected Class<OrderResult> getResultClass() {
    return OrderResult.class;
  }
}
```

**Key points:**
- Extend `BaseQueueListener` for automatic result storage
- Use `executor = "rqueueExecutor"` for virtual thread support
- Implement `processMessage()` with your business logic
- BaseQueueListener handles serialization and error tracking

### Pattern 3: Nested Workflow (Task Waiting for Subtask)

```java
@Component
@Slf4j
public class ComplexOrderListener extends BaseQueueListener<ComplexOrderTaskData, OrderResult> {

  private final QueueService queueService;
  private final WorkflowService workflowService;

  @RqueueListener(value = "complex-order", executor = "rqueueExecutor")
  @Transactional
  public void listen(ComplexOrderTaskData taskData) throws InterruptedException {
    handleMessage(taskData);
  }

  @Override
  protected OrderResult processMessage(ComplexOrderTaskData taskData, String taskId)
      throws InterruptedException {

    // Step 1: Dispatch inventory check
    InventoryCheckTaskData inventoryTask = InventoryCheckTaskData.builder()
      .workflowId(taskData.getWorkflowId())
      .parentTaskId(taskId)
      .orderId(taskData.getOrderId())
      .build();

    TaskHandle inventoryHandle = queueService.dispatch(
      QueueName.INVENTORY_CHECK,
      inventoryTask
    );

    // Step 2: Wait for inventory check (non-blocking - virtual thread suspends)
    InventoryResult inventory = workflowService.waitFor(inventoryHandle);

    if (!inventory.isAvailable()) {
      throw new OutOfStockException(taskData.getOrderId());
    }

    // Step 3: Continue processing with inventory result
    processPayment(taskData, inventory);

    return new OrderResult(taskData.getOrderId(), OrderStatus.COMPLETED);
  }
}
```

**Key points:**
- Listener runs in virtual thread (via `executor = "rqueueExecutor"`)
- `workflowService.waitFor()` suspends virtual thread, frees OS thread
- Code reads like synchronous flow, but is fully async
- Can have thousands of these running concurrently

### Pattern 4: Parallel Task Execution

```java
@Override
protected OrderResult processMessage(OrderTaskData taskData, String taskId)
    throws InterruptedException {

  // Dispatch multiple tasks in parallel
  TaskHandle validatePayment = queueService.dispatch(
    QueueName.VALIDATE_PAYMENT,
    paymentData
  );

  TaskHandle checkInventory = queueService.dispatch(
    QueueName.CHECK_INVENTORY,
    inventoryData
  );

  TaskHandle calculateShipping = queueService.dispatch(
    QueueName.CALCULATE_SHIPPING,
    shippingData
  );

  // Wait for all to complete
  List<Object> results = workflowService.waitForAll(
    List.of(validatePayment, checkInventory, calculateShipping)
  );

  PaymentResult payment = (PaymentResult) results.get(0);
  InventoryResult inventory = (InventoryResult) results.get(1);
  ShippingResult shipping = (ShippingResult) results.get(2);

  return finalizeOrder(payment, inventory, shipping);
}
```

**Key points:**
- All tasks dispatched immediately (parallel execution)
- `waitForAll()` blocks until all complete (but virtual thread suspends)
- Results returned in same order as handles

### Pattern 5: Top-Level Workflow (Not in Queue)

```java
@Service
public class BatchOrderProcessor {

  private final ExecutorService virtualThreads =
    Executors.newVirtualThreadPerTaskExecutor();

  private final QueueService queueService;
  private final WorkflowService workflowService;

  public void processBatchOrders(List<OrderData> orders) {
    // Launch thousands of workflows in parallel
    for (OrderData order : orders) {
      virtualThreads.submit(() -> processOrderWorkflow(order));
    }
  }

  private void processOrderWorkflow(OrderData order) {
    try {
      // Step 1: Validate
      TaskHandle validate = queueService.dispatch(
        QueueName.VALIDATE_ORDER,
        createValidateData(order)
      );
      ValidationResult validation = workflowService.waitFor(validate);

      // Step 2: Process if valid
      if (validation.isValid()) {
        TaskHandle process = queueService.dispatch(
          QueueName.PROCESS_ORDER,
          createProcessData(order, validation)
        );
        ProcessResult result = workflowService.waitFor(process);

        // Step 3: Notify
        notifyCustomer(order, result);
      }
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new RuntimeException("Workflow interrupted", e);
    }
  }
}
```

**Key points:**
- Top-level workflows use separate virtual thread executor
- Each workflow dispatches tasks and waits for results
- Can launch 10,000+ concurrent workflows without issue
- Virtual threads make this pattern practical

## Creating New Queue Tasks

### Step 1: Define Task Data

```java
package com.oneapi.model.queue;

@Data
@EqualsAndHashCode(callSuper = true)
@SuperBuilder(toBuilder = true)
@NoArgsConstructor
public class YourTaskData extends BaseTaskData {
  private String yourField1;
  private Integer yourField2;
  // Add your task-specific fields
}
```

### Step 2: Define Result Object

```java
package com.oneapi.model.queue;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class YourResult {
  private String resultField1;
  private Boolean success;
  // Add your result fields
}
```

### Step 3: Add Queue Name

```java
public enum QueueName {
  // ... existing queues
  YOUR_QUEUE("your.queue.name");

  private final String queueName;

  QueueName(String queueName) {
    this.queueName = queueName;
  }

  public String getQueueName() {
    return queueName;
  }
}
```

### Step 4: Create Listener

```java
@Component
@Slf4j
public class YourTaskListener extends BaseQueueListener<YourTaskData, YourResult> {

  @RqueueListener(value = "your.queue.name", executor = "rqueueExecutor", numRetries = "2")
  @Transactional
  public void listen(YourTaskData taskData) {
    handleMessage(taskData);
  }

  @Override
  protected YourResult processMessage(YourTaskData taskData, String taskId) {
    // Implement your business logic
    log.info("Processing task: {}", taskId);

    // Your code here

    return YourResult.builder()
      .resultField1("value")
      .success(true)
      .build();
  }

  @Override
  protected String getQueueName() {
    return "your.queue.name";
  }

  @Override
  protected Class<YourResult> getResultClass() {
    return YourResult.class;
  }
}
```

### Step 5: Configure Worker Threads (if needed)

In `application.yml`:
```yaml
rqueue:
  listener:
    concurrent:
      jobs: 3-10  # Min-max worker threads for this queue
```

## Performance Characteristics

### Virtual Thread Scaling

| Concurrent Workflows | OS Threads Used | Memory Overhead |
|---------------------|-----------------|-----------------|
| 1                   | ~1              | ~1KB            |
| 100                 | ~10             | ~100KB          |
| 1,000               | ~10             | ~1MB            |
| 10,000              | ~10             | ~10MB           |

**Comparison with OS threads:**
- 10,000 OS threads = ~10GB memory, system unusable
- 10,000 virtual threads = ~10MB memory, smooth operation

### Polling Overhead

Default poll interval: 5 seconds

**With 1,000 waiting workflows:**
- Status checks per second: ~200 (1000 / 5)
- Redis queries per second: ~200
- Negligible CPU impact

**Trade-off:** Slightly longer workflow completion time vs. simple implementation and no callback infrastructure.

## Testing Patterns

All tests follow strict AAA pattern from `unit-test-guidelines.md`:

```java
@Test
void waitFor_taskCompletes_returnsResult() throws InterruptedException {
  TaskHandle handle = TestUtil.createHandle("task-123");
  when(taskStatusService.isDone("task-123")).thenReturn(false, true);
  when(taskStatusService.getResult("task-123")).thenReturn("result");

  String result = workflowService.waitFor(handle, Duration.ofMillis(10));

  assertEquals("result", result);
}

static class TestUtil {
  static TaskHandle createHandle(String taskId) {
    return new TaskHandle(taskId);
  }
}
```

See `WorkflowServiceTest.java` and `VirtualThreadWorkflowIntegrationTest.java` for complete examples.

## Common Pitfalls

### 1. ThreadLocal Doesn't Propagate to Virtual Threads

```java
// BAD - context lost in virtual thread
requestContextHolder.setContext(context);  // In main thread
executor.submit(() -> {
  String apiKey = requestContextHolder.getApiKey();  // NULL!
});

// GOOD - set context in virtual thread
executor.submit(() -> {
  requestContextHolder.setContext(context);  // Set in this thread
  String apiKey = requestContextHolder.getApiKey();  // Works!
});
```

### 2. Using `@AllArgsConstructor` on Task Data

```java
// BAD - breaks rqueue deserialization
@Data
@AllArgsConstructor  // ❌ Don't use this!
public class TaskData extends BaseTaskData {
}

// GOOD - only no-arg constructor
@Data
@SuperBuilder
@NoArgsConstructor  // ✅ Only this
public class TaskData extends BaseTaskData {
}
```

### 3. Using `Instant` Instead of `Date`

```java
// BAD - rqueue cannot serialize
private Instant timestamp;  // ❌ Serialization fails

// GOOD - use Date
private Date timestamp;  // ✅ Works with rqueue
```

### 4. Calling `waitFor()` from Non-Virtual Thread

```java
// BAD - blocks OS thread
@GetMapping("/process")
public Response process() {
  TaskHandle handle = queueService.dispatch(...);
  Result r = workflowService.waitFor(handle);  // ❌ Blocks web thread!
  return Response.ok(r);
}

// GOOD - return handle immediately
@GetMapping("/process")
public TaskHandle process() {
  return queueService.dispatch(...);  // ✅ Non-blocking
}

// Client polls for result
@GetMapping("/status/{taskId}")
public boolean isDone(@PathVariable String taskId) {
  return taskStatusService.isDone(taskId);
}
```

## References

- **Rqueue Documentation:** https://github.com/sonus21/rqueue
- **Virtual Threads (JEP 444):** https://openjdk.org/jeps/444
- **Project Error Handling:** See `.claude/CLAUDE.md`
- **Test Patterns:** See `.claude/unit-test-guidelines.md`
- **Clean Code:** See `.claude/cleanCode.md`
