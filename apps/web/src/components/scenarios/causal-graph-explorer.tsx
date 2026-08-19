"use client";

import type {
  Assumption,
  CausalEdge,
  CausalNode,
  Citation,
  Confidence,
  SimulationResult,
} from "@ripplelab/contracts/simulation";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { useMemo, useState } from "react";

import { Card, CardHeader } from "@/components/ui/card";
import { ConfidenceBadge } from "@/components/ui/confidence-badge";
import { formatRupeesAndPaise } from "@/lib/profile/format";

type Selection = { id: string; type: "node" | "edge" };

type RippleNodeData = {
  graphNode: CausalNode;
  valueLabel: string;
};

type RippleFlowNode = Node<RippleNodeData, "ripple">;
type RippleFlowEdge = Edge<{ graphEdge: CausalEdge }, "smoothstep">;

type FormulaReference = {
  expression: string;
  version: string;
};

type InspectorDetails = {
  assumptions: ReadonlyArray<Assumption>;
  citations: ReadonlyArray<Citation>;
  confidence: Confidence;
  eyebrow: string;
  formula: FormulaReference;
  lag?: string;
  mechanism: string;
  title: string;
};

const repoRatePositions: Record<string, { x: number; y: number }> = {
  "repo-rate": { x: 0, y: 150 },
  "loan-rate": { x: 280, y: 40 },
  "monthly-emi": { x: 570, y: 40 },
  "deposit-rate": { x: 280, y: 270 },
  "deposit-income": { x: 570, y: 270 },
};

const inflationPositions: Record<string, { x: number; y: number }> = {
  "headline-inflation": { x: 0, y: 240 },
  "food-inflation": { x: 270, y: 0 },
  "housing-inflation": { x: 270, y: 120 },
  "transport-inflation": { x: 270, y: 240 },
  "utilities-inflation": { x: 270, y: 360 },
  "other-inflation": { x: 270, y: 480 },
  "personal-basket-inflation": { x: 560, y: 240 },
  "projected-expenses": { x: 850, y: 100 },
  "real-salary-growth": { x: 850, y: 260 },
  "real-portfolio-return": { x: 850, y: 420 },
};

const oilPricePositions: Record<string, { x: number; y: number }> = {
  "crude-oil-price": { x: 0, y: 210 },
  "retail-fuel-price": { x: 280, y: 30 },
  "direct-fuel-impact": { x: 570, y: 30 },
  "transport-impact": { x: 280, y: 180 },
  "food-impact": { x: 280, y: 330 },
  "utilities-impact": { x: 280, y: 480 },
  "annual-household-impact": { x: 860, y: 240 },
};

const incomeTaxPositions: Record<string, { x: number; y: number }> = {
  "annual-gross-income": { x: 0, y: 30 },
  "taxable-income": { x: 270, y: 120 },
  "policy-rate-shift": { x: 270, y: 350 },
  "current-tax": { x: 570, y: 20 },
  "proposed-tax": { x: 570, y: 270 },
  "annual-tax-impact": { x: 870, y: 145 },
  "monthly-take-home-impact": { x: 1_150, y: 145 },
};

const categoryLabels: Record<CausalNode["kind"], string> = {
  policy: "Policy",
  market: "Market",
  financial_product: "Financial product",
  household: "Household",
  outcome: "Outcome",
};

const formulaReferences: Record<string, FormulaReference> = {
  "repo-rate": {
    expression: "modeled repo rate = current repo rate + selected change",
    version: "scenario.repo_rate_change.v1",
  },
  "loan-rate": {
    expression: "loan-rate change = repo-rate change × loan pass-through",
    version: "rates.linear_pass_through.v1",
  },
  "monthly-emi": {
    expression: "EMI = P × r × (1 + r)ⁿ / ((1 + r)ⁿ - 1)",
    version: "loan.floating_rate_reset.v1",
  },
  "deposit-rate": {
    expression: "deposit-rate change = repo-rate change × deposit pass-through",
    version: "rates.linear_pass_through.v1",
  },
  "deposit-income": {
    expression: "interest = principal × annual rate × term / day-count basis",
    version: "deposit.simple_interest.v1",
  },
  "repo-to-loan-rate": {
    expression: "loan-rate change = repo-rate change × loan pass-through",
    version: "rates.linear_pass_through.v1",
  },
  "loan-rate-to-emi": {
    expression: "reset rate and remaining term are applied to the EMI formula",
    version: "loan.floating_rate_reset.v1",
  },
  "repo-to-deposit-rate": {
    expression: "deposit-rate change = repo-rate change × deposit pass-through",
    version: "rates.linear_pass_through.v1",
  },
  "deposit-rate-to-income": {
    expression: "reset gross interest - current gross interest",
    version: "deposit.simple_interest.v1",
  },
  "headline-inflation": {
    expression: "target CPI = current CPI + selected percentage-point change",
    version: "scenario.inflation_change.v1",
  },
  "food-inflation": {
    expression: "category rate = headline inflation × category pass-through",
    version: "inflation.category_projection.v1",
  },
  "housing-inflation": {
    expression: "category rate = headline inflation × category pass-through",
    version: "inflation.category_projection.v1",
  },
  "transport-inflation": {
    expression: "category rate = headline inflation × category pass-through",
    version: "inflation.category_projection.v1",
  },
  "utilities-inflation": {
    expression: "category rate = headline inflation × category pass-through",
    version: "inflation.category_projection.v1",
  },
  "other-inflation": {
    expression: "category rate = headline inflation × category pass-through",
    version: "inflation.category_projection.v1",
  },
  "personal-basket-inflation": {
    expression: "personal rate = Σ(category spend × category rate) / total spend",
    version: "inflation.personal_basket.v1",
  },
  "projected-expenses": {
    expression: "projected spend = current spend × (1 + annual rate × months / 12)",
    version: "inflation.category_projection.v1",
  },
  "real-salary-growth": {
    expression: "real growth = (1 + nominal salary growth) / (1 + personal inflation) - 1",
    version: "inflation.real_growth.v1",
  },
  "real-portfolio-return": {
    expression: "real return = (1 + nominal return) / (1 + personal inflation) - 1",
    version: "inflation.real_growth.v1",
  },
  "basket-to-expenses": {
    expression: "annual impact = -(target monthly spend - baseline monthly spend) × 12",
    version: "inflation.category_projection.v1",
  },
  "basket-to-real-salary": {
    expression: "real growth = (1 + nominal salary growth) / (1 + personal inflation) - 1",
    version: "inflation.real_growth.v1",
  },
  "basket-to-real-portfolio": {
    expression: "real return = (1 + nominal return) / (1 + personal inflation) - 1",
    version: "inflation.real_growth.v1",
  },
  "crude-oil-price": {
    expression: "crude change = (target USD/barrel - current USD/barrel) / current",
    version: "scenario.oil_price_change.v1",
  },
  "retail-fuel-price": {
    expression: "target retail price = current retail price × (1 + crude change × pass-through)",
    version: "oil.crude_to_retail.v1",
  },
  "direct-fuel-impact": {
    expression: "annual effect = -monthly litres × retail price change × 12",
    version: "oil.direct_fuel_cost.v1",
  },
  "transport-impact": {
    expression: "annual effect = -monthly spend × crude change × pass-through × 12",
    version: "oil.indirect_expense.v1",
  },
  "food-impact": {
    expression: "annual effect = -monthly spend × crude change × pass-through × 12",
    version: "oil.indirect_expense.v1",
  },
  "utilities-impact": {
    expression: "annual effect = -monthly spend × crude change × pass-through × 12",
    version: "oil.indirect_expense.v1",
  },
  "annual-household-impact": {
    expression: "annual total = direct fuel + transport + food + utilities",
    version: "oil.household_total.v1",
  },
  "crude-to-retail": {
    expression: "retail change = crude percentage change × crude-to-retail pass-through",
    version: "oil.crude_to_retail.v1",
  },
  "retail-to-direct-fuel": {
    expression: "annual effect = -monthly litres × retail price change × 12",
    version: "oil.direct_fuel_cost.v1",
  },
  "annual-gross-income": {
    expression: "gross modeled income = annual salary + other ordinary-rate income",
    version: "tax.taxable_income.v1",
  },
  "taxable-income": {
    expression: "taxable income = max(0, salary - standard deduction + other income)",
    version: "tax.taxable_income.v1",
  },
  "policy-rate-shift": {
    expression: "proposed paid-slab rate = clamp(current rate + selected pp change, 0%, 100%)",
    version: "scenario.income_tax_change.v1",
  },
  "current-tax": {
    expression: "current tax = slab tax - Section 87A relief + 4% cess",
    version: "tax.ay2026_27_new_regime.v1",
  },
  "proposed-tax": {
    expression: "proposed tax = shifted slab tax - Section 87A relief + 4% cess",
    version: "tax.ay2026_27_new_regime.v1",
  },
  "annual-tax-impact": {
    expression: "annual take-home impact = current total tax - proposed total tax",
    version: "tax.take_home_delta.v1",
  },
  "monthly-take-home-impact": {
    expression: "monthly take-home impact = annual take-home impact / 12",
    version: "tax.take_home_delta.v1",
  },
  "gross-to-taxable": {
    expression: "taxable income = max(0, salary - standard deduction + other income)",
    version: "tax.taxable_income.v1",
  },
  "taxable-to-current-tax": {
    expression: "Σ(taxable slab slice × current marginal rate), then relief and cess",
    version: "tax.ay2026_27_new_regime.v1",
  },
  "taxable-to-proposed-tax": {
    expression: "Σ(taxable slab slice × proposed marginal rate), then relief and cess",
    version: "tax.ay2026_27_new_regime.v1",
  },
  "policy-to-proposed-tax": {
    expression: "proposed paid-slab rate = current rate + selected percentage-point change",
    version: "scenario.income_tax_change.v1",
  },
  "current-tax-to-impact": {
    expression: "annual impact = current total tax - proposed total tax",
    version: "tax.take_home_delta.v1",
  },
  "proposed-tax-to-impact": {
    expression: "annual impact = current total tax - proposed total tax",
    version: "tax.take_home_delta.v1",
  },
  "annual-to-monthly-tax-impact": {
    expression: "monthly impact = annual impact / 12",
    version: "tax.take_home_delta.v1",
  },
};

function formulaReference(id: string) {
  if (formulaReferences[id]) return formulaReferences[id];
  if (id.startsWith("headline-to-")) return formulaReferences["food-inflation"];
  if (id.endsWith("-to-basket")) return formulaReferences["personal-basket-inflation"];
  if (id.startsWith("crude-to-") || id.endsWith("-to-total")) {
    return id.endsWith("-to-total")
      ? formulaReferences["annual-household-impact"]
      : formulaReferences["transport-impact"];
  }
  return formulaReferences["repo-rate"];
}

function formatNodeValue(node: CausalNode) {
  if (node.value === undefined) {
    return "No numeric value";
  }
  if (node.unit === "paise" || node.unit === "paise_per_year" || node.unit === "paise_per_month") {
    const suffix = node.unit === "paise_per_year" ? " / year" : node.unit === "paise_per_month" ? " / month" : "";
    return `${formatRupeesAndPaise(node.value)}${suffix}`;
  }
  if (node.unit === "basis_points") {
    return node.id === "repo-rate" ? `${node.value} bps` : `${(node.value / 100).toFixed(2)}%`;
  }
  if (node.unit === "paise_per_litre") {
    return `₹${(node.value / 100).toFixed(2)} / litre`;
  }
  if (node.unit === "usd_per_barrel") {
    return `$${node.value.toFixed(2)} / barrel`;
  }
  if (node.unit === "percentage_points") {
    return `${node.value > 0 ? "+" : ""}${node.value} pp`;
  }
  return `${node.value}${node.unit ? ` ${node.unit.replaceAll("_", " ")}` : ""}`;
}

function formatAssumption(assumption: Assumption) {
  if (typeof assumption.value !== "number") {
    return String(assumption.value);
  }
  if (assumption.unit === "ratio") {
    return `${Math.round(assumption.value * 100)}%`;
  }
  if (assumption.unit === "basis_points") {
    return `${(assumption.value / 100).toFixed(2)}%`;
  }
  if (assumption.unit === "paise") {
    return formatRupeesAndPaise(assumption.value);
  }
  if (assumption.unit === "paise_per_litre") {
    return `₹${(assumption.value / 100).toFixed(2)} / litre`;
  }
  if (assumption.unit === "litres_per_month") {
    return `${assumption.value} litres / month`;
  }
  return `${assumption.value} ${assumption.unit.replaceAll("_", " ")}`;
}

function confidenceLabel(level: Confidence["level"]) {
  return `${level.charAt(0).toUpperCase()}${level.slice(1)}` as "Low" | "Medium" | "High";
}

function uniqueIds(values: ReadonlyArray<ReadonlyArray<string>>) {
  return [...new Set(values.flat())];
}

function relatedItems<T extends { id: string }>(items: ReadonlyArray<T>, ids: ReadonlyArray<string>) {
  const wanted = new Set(ids);
  return items.filter((item) => wanted.has(item.id));
}

function nodeDetails(result: SimulationResult, node: CausalNode): InspectorDetails {
  const relatedEdges = result.causalGraph.edges.filter(
    (edge) => edge.source === node.id || edge.target === node.id,
  );
  const incomingEdge = relatedEdges.find((edge) => edge.target === node.id);
  const outgoingEdge = relatedEdges.find((edge) => edge.source === node.id);
  const impact = result.impacts.find((item) => item.causalNodeId === node.id);
  const assumptionIds = uniqueIds(relatedEdges.map((edge) => edge.assumptionIds));
  const citationIds = uniqueIds(relatedEdges.map((edge) => edge.citationIds));

  return {
    assumptions: relatedItems(result.assumptions, assumptionIds),
    citations: relatedItems(result.citations, citationIds),
    confidence:
      impact?.confidence ?? incomingEdge?.confidence ?? outgoingEdge?.confidence ?? result.confidence,
    eyebrow: `${categoryLabels[node.kind]} node`,
    formula: formulaReference(node.id),
    mechanism:
      impact?.mechanism ??
      incomingEdge?.mechanism ??
      outgoingEdge?.mechanism ??
      "This node is part of the engine-returned causal path.",
    title: node.label,
  };
}

function edgeDetails(result: SimulationResult, edge: CausalEdge): InspectorDetails {
  const source = result.causalGraph.nodes.find((node) => node.id === edge.source);
  const target = result.causalGraph.nodes.find((node) => node.id === edge.target);
  const lag =
    edge.lagMonths.minimum === edge.lagMonths.maximum
      ? `${edge.lagMonths.minimum} months`
      : `${edge.lagMonths.minimum}-${edge.lagMonths.maximum} months`;

  return {
    assumptions: relatedItems(result.assumptions, edge.assumptionIds),
    citations: relatedItems(result.citations, edge.citationIds),
    confidence: edge.confidence,
    eyebrow: `${edge.direction} causal link`,
    formula: formulaReference(edge.id),
    lag,
    mechanism: edge.mechanism,
    title: `${source?.label ?? edge.source} → ${target?.label ?? edge.target}`,
  };
}

function RippleNode({ data }: NodeProps<RippleFlowNode>) {
  const { graphNode, valueLabel } = data;

  return (
    <div className={`causal-node causal-node--${graphNode.kind}`}>
      <Handle isConnectable={false} position={Position.Left} type="target" />
      <span>{categoryLabels[graphNode.kind]}</span>
      <strong>{graphNode.label}</strong>
      <small>{valueLabel}</small>
      <Handle isConnectable={false} position={Position.Right} type="source" />
    </div>
  );
}

const nodeTypes = { ripple: RippleNode };

export function CausalGraphExplorer({ result }: { result: SimulationResult }) {
  const initialId = result.causalGraph.nodes[0]?.id ?? "repo-rate";
  const [selection, setSelection] = useState<Selection>({ id: initialId, type: "node" });
  const positions =
    result.scenarioType === "inflation_change"
      ? inflationPositions
      : result.scenarioType === "oil_price_change"
        ? oilPricePositions
        : result.scenarioType === "income_tax_change"
          ? incomeTaxPositions
          : repoRatePositions;
  const presentKinds = [...new Set(result.causalGraph.nodes.map((node) => node.kind))];
  const isInflation = result.scenarioType === "inflation_change";
  const isOilPrice = result.scenarioType === "oil_price_change";
  const isIncomeTax = result.scenarioType === "income_tax_change";

  const nodes = useMemo<RippleFlowNode[]>(
    () =>
      result.causalGraph.nodes.map((graphNode, index) => {
        const valueLabel = formatNodeValue(graphNode);
        return {
          id: graphNode.id,
          type: "ripple",
          position: positions[graphNode.id] ?? { x: index * 220, y: 150 },
          data: { graphNode, valueLabel },
          draggable: false,
          connectable: false,
          focusable: true,
          selectable: true,
          selected: selection.type === "node" && selection.id === graphNode.id,
          ariaRole: "button",
          ariaLabel: `${graphNode.label}, ${categoryLabels[graphNode.kind]} node, ${valueLabel}. Press Enter or Space to inspect.`,
        };
      }),
    [positions, result.causalGraph.nodes, selection],
  );

  const edges = useMemo<RippleFlowEdge[]>(
    () =>
      result.causalGraph.edges.map((graphEdge) => {
        const source = result.causalGraph.nodes.find((node) => node.id === graphEdge.source);
        const target = result.causalGraph.nodes.find((node) => node.id === graphEdge.target);
        const selected = selection.type === "edge" && selection.id === graphEdge.id;
        const color = selected ? "#e0a126" : "#087e8b";
        return {
          id: graphEdge.id,
          source: graphEdge.source,
          target: graphEdge.target,
          type: "smoothstep",
          data: { graphEdge },
          focusable: true,
          selectable: true,
          selected,
          ariaRole: "button",
          ariaLabel: `${source?.label ?? graphEdge.source} to ${target?.label ?? graphEdge.target}. ${graphEdge.mechanism} Press Enter or Space to inspect.`,
          interactionWidth: 28,
          markerEnd: { color, height: 18, type: MarkerType.ArrowClosed, width: 18 },
          style: { stroke: color, strokeWidth: selected ? 3 : 2 },
        };
      }),
    [result.causalGraph.edges, result.causalGraph.nodes, selection],
  );

  function select(next: Selection) {
    setSelection((current) =>
      current.type === next.type && current.id === next.id ? current : next,
    );
  }

  const selectedNode = result.causalGraph.nodes.find(
    (node) => selection.type === "node" && node.id === selection.id,
  );
  const selectedEdge = result.causalGraph.edges.find(
    (edge) => selection.type === "edge" && edge.id === selection.id,
  );
  const details = selectedEdge
    ? edgeDetails(result, selectedEdge)
    : nodeDetails(result, selectedNode ?? result.causalGraph.nodes[0]);

  return (
    <Card className="repo-causal-card" elevated>
      <CardHeader
        eyebrow="Interactive causal graph"
        title={
          isInflation
            ? "Trace headline inflation through your basket and purchasing power"
            : isOilPrice
              ? "Trace crude oil through direct and indirect household costs"
              : isIncomeTax
                ? "Trace income through current tax, proposed tax and take-home pay"
                : "Trace the result from policy decision to personal cash flow"
        }
      />
      <p className="repo-causal-instructions">
        Select a node or arrow to inspect it. Keyboard: Tab through the graph, then press Enter or
        Space. Use the controls to zoom or fit the complete path.
      </p>
      <div className="repo-causal-legend" aria-label="Node categories">
        {presentKinds.map((kind) => (
          <span className={`repo-causal-legend__${kind}`} key={kind}>{categoryLabels[kind]}</span>
        ))}
        <i>Amber indicates the selected relationship.</i>
      </div>

      <div className="repo-causal-workspace">
        <div className="repo-causal-canvas" aria-label={`${result.scenarioType.replaceAll("_", " ")} causal graph`}>
          <ReactFlow<RippleFlowNode, RippleFlowEdge>
            ariaLabelConfig={{
              "controls.ariaLabel": "Causal graph view controls",
              "controls.fitView.ariaLabel": "Fit complete causal graph",
              "controls.zoomIn.ariaLabel": "Zoom into causal graph",
              "controls.zoomOut.ariaLabel": "Zoom out of causal graph",
              "minimap.ariaLabel": "Causal graph overview",
            }}
            autoPanOnNodeFocus
            colorMode="light"
            deleteKeyCode={null}
            disableKeyboardA11y={false}
            edges={edges}
            edgesFocusable
            edgesReconnectable={false}
            elementsSelectable
            fitView
            fitViewOptions={{ maxZoom: 1.05, padding: 0.18 }}
            minZoom={0.45}
            nodes={nodes}
            nodesConnectable={false}
            nodesDraggable={false}
            nodesFocusable
            nodeTypes={nodeTypes}
            onEdgeClick={(_, edge) => select({ id: edge.id, type: "edge" })}
            onEdgesChange={(changes) => {
              const change = changes.find((item) => item.type === "select" && item.selected);
              if (change?.type === "select") {
                select({ id: change.id, type: "edge" });
              }
            }}
            onNodeClick={(_, node) => select({ id: node.id, type: "node" })}
            onNodesChange={(changes) => {
              const change = changes.find((item) => item.type === "select" && item.selected);
              if (change?.type === "select") {
                select({ id: change.id, type: "node" });
              }
            }}
            panOnScroll
            preventScrolling={false}
            proOptions={{ hideAttribution: false }}
            zoomOnDoubleClick={false}
          >
            <Background color="#cbd8dd" gap={24} size={1.2} variant={BackgroundVariant.Dots} />
            <MiniMap
              aria-label="Causal graph overview"
              maskColor="rgb(23 32 51 / 0.08)"
              nodeColor={(node) => {
                const kind = (node.data as RippleNodeData).graphNode.kind;
                return kind === "policy" ? "#172033" : kind === "household" ? "#e0a126" : "#087e8b";
              }}
              nodeStrokeWidth={3}
              pannable
              zoomable
            />
            <Controls fitViewOptions={{ maxZoom: 1.05, padding: 0.18 }} showInteractive={false} />
          </ReactFlow>
        </div>

        <aside aria-live="polite" className="repo-causal-inspector" data-testid="causal-inspector">
          <header>
            <div>
              <p className="eyebrow">{details.eyebrow}</p>
              <h3>{details.title}</h3>
            </div>
            <ConfidenceBadge
              detail={details.confidence.rationale}
              level={confidenceLabel(details.confidence.level)}
            />
          </header>

          <section>
            <h4>Mechanism</h4>
            <p>{details.mechanism}</p>
          </section>

          <section>
            <h4>Formula</h4>
            <code>{details.formula.expression}</code>
            <small>{details.formula.version}</small>
          </section>

          {details.lag ? (
            <section>
              <h4>Modeled lag</h4>
              <p>{details.lag}</p>
            </section>
          ) : null}

          <section>
            <h4>Assumptions</h4>
            {details.assumptions.length ? (
              <ul className="repo-causal-assumptions">
                {details.assumptions.map((assumption) => (
                  <li key={assumption.id}>
                    <span>
                      <strong>{assumption.label}</strong>
                      <b>{formatAssumption(assumption)}</b>
                    </span>
                    <p>{assumption.rationale}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No additional assumption is required for this selected policy input.</p>
            )}
          </section>

          <section>
            <h4>Source</h4>
            {details.citations.length ? (
              <ul className="repo-causal-sources">
                {details.citations.map((citation) => (
                  <li key={citation.id}>
                    <a href={citation.url} rel="noreferrer" target="_blank">
                      {citation.title}
                    </a>
                    <span>{citation.publisher} · {citation.locator}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>This value comes from the saved profile or selected scenario rather than an external dataset.</p>
            )}
          </section>

          <footer>
            <strong>{details.confidence.score}/100 confidence</strong>
            <p>{details.confidence.rationale}</p>
          </footer>
        </aside>
      </div>
    </Card>
  );
}
