---
description: Prompt system using YAML prompts and PromptClient
---

# Prompt System

All AI prompts are stored as YAML files in the `/prompts` directory and accessed via `PromptClient`.

## Prompt Structure

Prompts are YAML files with this structure:

```yaml
name: epic-agent-system
description: System prompt for Epic agent
variables:
  - name: account_name
    description: Name of the account
    default: ""
  - name: format
    description: Output format description

variants:
  - name: default
    content: |
      You are an AI agent that processes COI requests.
      Account: {{ account_name }}

      Output format:
      {{ format }}
```

**Fields:**
- `name` - Unique identifier for the prompt
- `description` - What this prompt does
- `variables` - Template variables (with optional defaults)
- `variants` - Different versions (usually just "default")

## Using PromptClient

**Load a prompt:**
```java
String promptContent = promptClient.getPrompt("epic-agent/system");
```

**Load with variables:**
```java
Map<String, String> vars = new HashMap<>();
vars.put("account_name", "Acme Corp");
vars.put("format", "JSON");

String promptContent = promptClient.getPrompt("epic-agent/system", vars);
```

**Template syntax:**
Prompts support Jinja2 template syntax:
- `{{ variable }}` - Variable substitution
- `{% if condition %}...{% endif %}` - Conditionals
- `{% for item in list %}...{% endfor %}` - Loops

## PromptClientBuilder

For composing multiple prompts together:

```java
String composedPrompt = new PromptClientBuilder(promptClient)
    .addPrompt("epic-agent/system")
    .addText(outputConverter.getFormat())
    .addPrompt("epic-agent/api-reference")
    .setVariable(Map.of(
        "account_name", workOrder.getInsuredName(),
        "certificate_holder", orderData.getCertificateHolderName()
    ))
    .build();
```

**Methods:**
- `addPrompt(path)` - Add a prompt from file
- `addPrompt(path, variables)` - Add prompt with variable overrides
- `addText(text)` - Add raw text (not from file)
- `setVariable(variables)` - Set shared variables for all prompts
- `build()` - Returns concatenated string

**Example:** See `/java/core/src/main/java/com/betterbroker/core/prompts/PromptClientBuilder.java:22`

## Real-World Example

From `CoiGenerationActivityImpl`:

```java
String systemPrompt = new PromptClientBuilder(promptClient)
    .addPrompt("coi-generation/system")
    .addText("\n\nOutput Format:\n" + outputFormat)
    .addPrompt("coi-generation/requirements")
    .setVariable(Map.of(
        "insured_name", workOrder.getInsuredName(),
        "certificate_holder", orderData.getCertificateHolderName(),
        "requester_email", orderData.getCertificateRequesterEmail()
    ))
    .build();

ChatResponse response = chatClient.prompt()
    .system(systemPrompt)
    .user(userMessage)
    .call()
    .chatResponse();
```

## Prompt Organization

**Directory structure:**
```
/prompts/
  epic-agent/
    system.yaml
    api-reference.yaml
  coi-generation/
    system.yaml
    requirements.yaml
  validation/
    compliance.yaml
    coverage.yaml
```

**Naming convention:**
- Use kebab-case for directories and files
- Group related prompts in subdirectories
- Use descriptive names: `system.yaml`, `api-reference.yaml`, `requirements.yaml`

## Variables Best Practices

**Always provide defaults for optional variables:**
```yaml
variables:
  - name: account_name
    description: Name of the account
    default: "Unknown Account"
```

**Document required variables:**
```yaml
variables:
  - name: certificate_holder
    description: Name of certificate holder (REQUIRED)
```

**Use descriptive variable names:**
- Good: `certificate_holder_name`, `requester_email`, `insured_name`
- Bad: `name`, `email`, `data`

## Spring AI Integration

Prompts are used with Spring AI's `ChatClient`:

```java
@Component
public class CoiGenerationActivityImpl {

  private final PromptClient promptClient;
  private final ChatClient chatClient;

  public GenerateCoiTextReturn generateCoiText(GenerateCoiTextPayload payload) {
    String systemPrompt = promptClient.getPrompt("coi-generation/system", variables);
    String userPrompt = promptClient.getPrompt("coi-generation/user", variables);

    ChatResponse response = chatClient.prompt()
        .system(systemPrompt)
        .user(userPrompt)
        .call()
        .chatResponse();

    return parseResponse(response);
  }
}
```

## Prompt Caching

`PromptClient` automatically caches loaded prompts:
- First load reads from disk/classpath
- Subsequent loads return cached version
- Cache is per-instance, thread-safe

**No manual cache management needed.**

## Testing Prompts

**Location:** Test prompts in `src/test/resources/prompts/`

**Pattern:**
```java
@Test
void testCoiPrompt() throws IOException {
  PromptClient client = new PromptClient("prompts");
  String content = client.getPrompt("coi-generation/system",
      Map.of("insured_name", "Test Corp"));

  assertThat(content).contains("Test Corp");
  assertThat(content).contains("COI request");
}
```

## Migration Notes

**Old API (deprecated):**
```java
promptClient.OLD_getPrompt(path, variant, variables);
```

**New API (current):**
```java
promptClient.getPrompt(path, variables);
```

The new API uses Jinja2 rendering and is more flexible. Always use the new API.
