# RippleLab MVP User Journeys

## Journey 1: First personal simulation

1. The visitor understands the product scope and non-advice boundary.
2. They create an account and enter a minimum viable financial profile.
3. They ask a supported economic what-if question or choose a scenario template.
4. RippleLab shows the structured interpretation and asks for confirmation.
5. The deterministic engine calculates personal impacts.
6. The user sees monthly/annual effects, ranges, assumptions and confidence.
7. They inspect causal links and their evidence.
8. They save the reproducible scenario snapshot.

**Success:** The user can explain what changed, why, by how much and under which assumptions.

## Journey 2: Compare policy variants

1. A user selects a saved profile and a supported scenario.
2. They define a baseline and up to three variants.
3. RippleLab runs every variant with the same profile and formula version.
4. The user compares aligned impacts and distributions.

**Success:** Differences reconcile with each individual result and the assumptions remain visible.

## Journey 3: Explore winners and losers

1. A user chooses a scenario.
2. They select transparent sample personas such as a student/renter, homeowner, business owner and retiree/saver.
3. RippleLab runs the same scenario contract for each persona.
4. The user inspects why the effects differ without treating personas as population forecasts.

**Success:** Persona inputs are visible, editable and never represented as a claim about an entire demographic group.

## Journey 4: Share a result safely

1. A user opens a saved, versioned result.
2. They review fields included in a report and accept privacy-safe defaults.
3. RippleLab creates a redacted PDF or revocable share link.
4. A recipient can inspect results, assumptions, evidence, model version and disclaimer without gaining account access.

**Success:** No private profile field is shared without explicit inclusion.

## Failure journeys

- Unsupported question: explain the boundary and offer the five supported templates.
- Ambiguous units: request confirmation instead of guessing.
- LLM unavailable: use the deterministic scenario form and templated explanation.
- Engine unavailable: preserve inputs, explain the failure and allow retry.
- Stale policy/tax year: display applicability and reject unsupported calculations.
