# Use Cases

reactAI is built on a specific premise: **an AI that understands your app's data model will always outperform an AI that mimics a user**.

Most AI agents interact with websites the same way a human would — they read the screen, find a button, click it, wait for a response, find the next input, type into it. This works. But it's slow, fragile, and fundamentally limited by the fact that the UI was designed for humans, not agents.

reactAI takes a different position. The AI operates at the component layer, not the DOM layer. It doesn't simulate a user — it directly updates state, the same way React itself does.

---

## Why browser agents struggle

A browser agent sees your app the way a stranger sees a locked room through a keyhole: it can observe, but it can't participate.

**They work with representations, not data.**
A browser agent sees `"$142.50"`. reactAI sees `{ price: 142.5, currency: "USD" }`. When the agent needs to change the price, it has to locate the right element on the screen, figure out the input field, clear it, type the new value, and submit — hoping the format is right. reactAI sends `{ price: 189.0 }`.

**They operate serially.**
Browser agents act one step at a time: click, wait, type, wait, click. To update five components, they take five separate actions. reactAI sends one patch that touches any number of components simultaneously.

**They can't distinguish intent from side effects.**
Clicking "Save" on a form might trigger a validation flow, fire an analytics event, navigate to a new page, or trigger a toast. A browser agent has no way to know — it just clicks and hopes. reactAI only updates the props you declared as AI-writable. Functions, event handlers, and callbacks are never touched.

**They break when the UI shifts.**
CSS changes, element repositioning, new overlays, animations mid-flight — all of these break a browser agent's selectors. reactAI is bound to the component, not the DOM. A layout refactor doesn't affect it at all.

**They can't reason about state.**
A browser agent infers state from what it sees. If a button is disabled, the agent has to guess why. reactAI receives the actual current state of every mounted component with every prompt — `{ column: "in-progress", priority: "high", assignee: "alice" }` — and can reason directly from it.

---

## What reactAI enables

### Live demos and sales scenarios

Demos run on real apps with real data. When a prospect asks "what does a bad quarter look like?" you don't want to manually edit 12 fields across 6 components.

```
"Show the portfolio dashboard after a rough week — AAPL down 12%, everything in the red"
```

reactAI patches every stock card simultaneously. The dashboard updates in one round-trip. The demo keeps moving.

A browser agent would have to navigate to each card's edit view, find the price field, clear it, type a new value, and save — then repeat for every card. That's not a demo, that's data entry.

---

### AI copilots in complex dashboards

The value of an AI copilot comes from understanding what's on the screen and acting on it — not just answering questions about it.

```
"Move all of Alice's overdue tasks to Bob and mark them urgent"
```

reactAI reads the current snapshot: all Kanban cards, their assignees, their due dates, their priorities. It produces a single patch that updates the relevant cards. No navigation, no clicking through card menus, no drag-and-drop simulation.

This is what "operating the app" looks like from the inside. The AI doesn't pretend to be a user — it acts as a peer system with direct access to the data model.

---

### What-if simulations

Financial dashboards, operations tools, and analytics platforms all have the same need: show me a different state without changing real data.

```
"Simulate Q4 if we hit our stretch targets — spike the weekly activity chart,
 update the revenue metric, and show the 'on track' badge on the OKR panel"
```

A browser agent has to find each component, find its edit controls, make changes one at a time. reactAI sends one patch. All components update atomically. When the demo is over, there's no cleanup — nothing was persisted.

---

### Rapid QA and scenario setup

Getting an application into a specific state for testing is expensive. Clicking through five screens to reproduce an edge case takes time and breaks as the UI changes.

```
"Set up the checkout with three items in the cart, one out of stock,
 and a 10% coupon applied — show the error state for the out-of-stock item"
```

reactAI sets this up in one call. QA engineers describe the scenario in plain language. The AI maps it to the component tree and patches accordingly. No click scripts, no fixture files, no Playwright chains.

---

### Personalization and UI adaptation

```
"Switch to the high-contrast theme, increase all text to large, and collapse the sidebar"
```

When UI preferences span multiple components — theme provider, font settings, layout state — coordinating them through DOM interaction is tedious. reactAI patches them together. The user says what they want; the AI applies it everywhere at once.

---

### Presentation and content staging

Marketing teams, designers, and product managers frequently need to show the UI in a specific state — for a screenshot, a review, a stakeholder presentation.

```
"Update the store banner to announce the summer sale, feature the headphones at $69,
 and mark the running shoes as sold out"
```

Instead of a series of CMS edits across three different panels, this is a single prompt. Every component that needs to change, changes — simultaneously, correctly.

---

## The underlying difference

Browser agents are pilots who fly by looking out the window. reactAI gives the AI the instrument panel.

The instrument panel knows airspeed as a number, not as a needle position on a gauge. It accepts inputs directly — set altitude to 35,000, set heading to 270 — without simulating the physical act of turning a knob. It can update multiple instruments simultaneously without a sequence of manual adjustments.

That's what it means to make AI a first-class citizen for component state. Not a smarter way to click buttons — a fundamentally different level of access.
