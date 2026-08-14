# Causal Graph Framework v1

## Purpose

Day 8 turns the Day 7 repo-rate result into an inspectable economic chain. The graph visualizes the typed `SimulationResult`; it does not recalculate rates, EMI, deposit interest or annual impact in the browser.

```text
SimulationResult.causalGraph
  -> fixed presentation layout
  -> categorized React Flow nodes and directional edges
  -> synchronized mechanism, formula, assumption, source and confidence inspector
```

## Graph boundary

The engine owns node IDs, values, units, edge direction, mechanisms, lag ranges, assumption references, citation references and confidence. The frontend owns spatial positions, category styling, human-readable value formatting and formula-reference labels.

This separation prevents the visual layer from becoming a second economic model. If the engine changes a causal relationship, the graph follows the returned nodes and edges.

## Repo-rate topology

| Path | Engine relationship | Formula reference |
| --- | --- | --- |
| RBI repo rate -> floating loan rate | Policy move transmitted through the selected loan pass-through | `rates.linear_pass_through.v1` |
| Floating loan rate -> monthly EMI | Reset rate applied with the remaining term held constant | `loan.floating_rate_reset.v1` |
| RBI repo rate -> deposit renewal rate | Policy move transmitted through the selected deposit pass-through | `rates.linear_pass_through.v1` |
| Deposit renewal rate -> deposit income | Reset rate applied to gross annual simple interest | `deposit.simple_interest.v1` |

The seeded result contains five material nodes and four directional edges. The graph uses policy, financial-product and household categories.

## Inspector contract

Selecting a node resolves its mechanism from the related personal impact or nearest causal edge. Selecting an edge displays the engine-returned mechanism directly. Both selection types expose:

- formula expression and version reference;
- every referenced editable assumption and its rationale;
- every referenced citation and locator;
- confidence level, numeric score and rationale;
- modeled lag range for edges.

The formula expressions are explanatory labels for the already-versioned engine primitives. They are not evaluated in TypeScript.

## Interaction and accessibility

The graph is deliberately read-only. Nodes cannot be dragged or connected, edges cannot be reconnected and the Delete key is disabled. This protects economic relationships from accidental editing while preserving viewport exploration.

Nodes and edges are focusable. A keyboard user can Tab through graph elements and press Enter or Space to update the inspector. Focused elements are automatically panned into view. Zoom, zoom-out and fit-view controls have explicit labels. A minimap supports overview navigation on larger screens and is hidden on narrow screens where it would obscure the graph.

On screens below 920 pixels the inspector moves beneath the canvas. At phone widths the graph receives a shorter fixed viewport and the category legend wraps without horizontal overflow.

## Confidence and evidence

The graph does not raise confidence merely by visualizing a relationship. Each selected edge retains the confidence returned by the economic engine. The inspector links to the result's Reserve Bank of India monetary-policy reference and keeps user-selected transmission ratios visibly labeled as assumptions.

## Verification

- Browser coverage selects the Monthly EMI node and verifies its formula and term assumption.
- Keyboard coverage focuses the loan-rate-to-EMI edge, presses Enter and verifies the inspector update.
- The edge panel verifies its 0-1 month lag and RBI source link.
- The result state is checked for serious and critical accessibility violations.
- Desktop and mobile browser suites verify the surrounding responsive experience.
