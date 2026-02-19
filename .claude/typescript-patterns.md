---
description: React and TypeScript component patterns, hooks, and code organization
---

# TypeScript Patterns

Standard patterns for React components, hooks, and TypeScript code organization.

## Component Pattern

**File Naming:**
- File name must match component name
- Use PascalCase: `MyComponent.tsx`
- SCSS file uses kebab-case: `my-component.scss`

**Component Structure:**
```typescript
import React from 'react';
import './my-component.scss';

interface MyComponentProps {
  title: string;
  count: number;
  onSubmit: (value: string) => void;
}

export const MyComponent = ({ title, count, onSubmit }: MyComponentProps) => {
  const [value, setValue] = React.useState('');

  const handleSubmit = React.useCallback(() => {
    onSubmit(value);
  }, [value, onSubmit]);

  const content = React.useMemo(() => {
    return <div className="content">{title}</div>;
  }, [title]);

  return (
    <div className="my-component">
      {content}
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
};
```

**Key Rules:**
- Export with `export const MyComponent` (NOT default export)
- Props interface named `MyComponentProps`
- SCSS class name matches kebab-case file name
- DO NOT use `React.FC` type - use inline props typing

## Exports

**NO default exports:**
```typescript
// Good
export const MyComponent = () => { ... };

// Bad
export default MyComponent;
```

**NO barrel files/index.ts:**
Each component exports itself. Import directly from component file:
```typescript
// Good
import { MyComponent } from '@webapp/components/MyComponent';

// Bad
import { MyComponent } from '@webapp/components';
```

## Props Interface

**Always define props interface:**
```typescript
interface MyComponentProps {
  // Required props
  userId: string;
  onSave: (data: FormData) => void;

  // Optional props
  title?: string;
  isLoading?: boolean;

  // Children
  children?: React.ReactNode;
}
```

**Naming:** `{ComponentName}Props`

## Hooks

**Use useMemo for building JSX:**
```typescript
const headerContent = React.useMemo(() => {
  return (
    <div className="header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
}, [title, subtitle]);
```

**Use useCallback for event handlers:**
```typescript
const handleClick = React.useCallback((id: string) => {
  onClick(id);
}, [onClick]);
```

**Extract API logic to custom hooks:**
```typescript
// hooks/useDocuments.ts
export const useDocuments = (clientContextId: string) => {
  const [documents, setDocuments] = React.useState<ClientDocument[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchDocuments = React.useCallback(async () => {
    setLoading(true);
    try {
      const docs = await getDocumentsByClientContextId({ query: { clientContextId } });
      setDocuments(docs);
    } finally {
      setLoading(false);
    }
  }, [clientContextId]);

  React.useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return { documents, loading, refetch: fetchDocuments };
};

// Component usage
const { documents, loading, refetch } = useDocuments(contextId);
```

## JSX Complexity

**Keep JSX simple - extract complex logic:**

**Bad:**
```typescript
return (
  <div>
    {items.filter(x => x.active).map(item => (
      <div key={item.id}>
        {item.type === 'A' ? <ComponentA /> : <ComponentB />}
        {item.details && item.details.length > 0 && (
          <ul>{item.details.map(d => <li key={d.id}>{d.name}</li>)}</ul>
        )}
      </div>
    ))}
  </div>
);
```

**Good:**
```typescript
const activeItems = React.useMemo(() =>
  items.filter(x => x.active),
  [items]
);

const renderItem = React.useCallback((item: Item) => {
  const Component = item.type === 'A' ? ComponentA : ComponentB;
  return (
    <div key={item.id}>
      <Component />
      {renderDetails(item.details)}
    </div>
  );
}, []);

const renderDetails = (details?: Detail[]) => {
  if (!details || details.length === 0) return null;
  return (
    <ul>
      {details.map(d => <li key={d.id}>{d.name}</li>)}
    </ul>
  );
};

return <div>{activeItems.map(renderItem)}</div>;
```

## Import Paths

Use path aliases for imports:

```typescript
// Core utilities
import { formatDate } from '@core/utils/date';

// Model types and API client
import { ClientDocument } from '@model/types';
import { getDocumentsByClientContextId } from '@model/client';

// UI components
import { Button } from '@ui/components/Button';

// Webapp-specific
import { useAuth } from '@webapp/hooks/useAuth';
```

**Path Aliases:**
- `@core/*` - Core utilities, shared logic
- `@model/*` - Generated API client and types
- `@ui/*` - UI component library
- `@webapp/*` - Application-specific code

## SCSS Patterns

**Class naming - kebab-case:**
```scss
.my-component {
  display: flex;

  .header {
    font-size: 24px;
  }

  .content {
    padding: 16px;

    &.active {
      background: blue;
    }
  }
}
```

**BEM-style for variants:**
```scss
.my-component {
  &__header { } // my-component__header
  &__content { } // my-component__content
  &--large { }   // my-component--large
}
```

## TypeScript Types

**Prefer types over interfaces for unions:**
```typescript
type Status = 'pending' | 'approved' | 'rejected';
type Result = Success | Error;
```

**Interfaces for object shapes:**
```typescript
interface User {
  id: string;
  name: string;
  email: string;
}
```

**Utility types:**
```typescript
type PartialUser = Partial<User>;
type RequiredUser = Required<User>;
type UserWithoutId = Omit<User, 'id'>;
type UserIdAndName = Pick<User, 'id' | 'name'>;
```

## API Integration

**NEVER call APIs directly - use SDK:**

```typescript
// Good - use generated SDK
import { getDocumentsByClientContextId, uploadDocument } from '@model/client';

const documents = await getDocumentsByClientContextId({
  query: { clientContextId: 'ctx-123' }
});

// Bad - direct fetch calls
const response = await fetch('/api/documents?clientContextId=ctx-123');
```

## Testing Patterns

We don't write unit tests in this codebase, but if we did:

**AAA Pattern:**
```typescript
describe('MyComponent', () => {
  it('should handle click', () => {
    // Arrange
    const onClickMock = jest.fn();
    const { getByText } = render(<MyComponent onClick={onClickMock} />);


    // Act
    fireEvent.click(getByText('Submit'));


    // Assert
    expect(onClickMock).toHaveBeenCalled();
  });
});
```

Note: Exactly 2 blank lines between Arrange/Act/Assert sections.

## Code Organization

**Component file structure:**
```
components/
  MyComponent/
    MyComponent.tsx       # Component code
    my-component.scss     # Styles
    MyComponent.test.tsx  # Tests (if we wrote them)
```

**Hook file structure:**
```
hooks/
  useDocuments.ts
  useAuth.ts
  useWorkOrders.ts
```

**No nested directories for single components:**
```
// Good
components/UserCard.tsx
components/user-card.scss

// Bad (overkill for simple component)
components/UserCard/index.tsx
components/UserCard/UserCard.tsx
```
