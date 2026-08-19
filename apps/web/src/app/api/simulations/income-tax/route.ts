import { getCurrentUser } from "@/lib/auth/session";

function errorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  if (
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }
  if (
    "detail" in payload &&
    payload.detail &&
    typeof payload.detail === "object" &&
    "message" in payload.detail &&
    typeof payload.detail.message === "string"
  ) {
    return payload.detail.message;
  }
  return fallback;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { error: { code: "AUTH_REQUIRED", message: "Sign in before running a personal scenario." } },
      { status: 401 },
    );
  }

  const engineUrl = process.env.RIPPLELAB_ENGINE_URL?.replace(/\/$/, "");
  if (!engineUrl) {
    return Response.json(
      {
        error: {
          code: "ENGINE_UNAVAILABLE",
          message: "The economic engine is not connected on this deployment yet.",
        },
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { code: "INVALID_JSON", message: "The scenario request was not valid JSON." } },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(`${engineUrl}/v1/simulations/income-tax`, {
      body: JSON.stringify(body),
      cache: "no-store",
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const payload: unknown = await response.json();
    if (!response.ok) {
      return Response.json(
        {
          error: {
            code: "SIMULATION_REJECTED",
            message: errorMessage(payload, "Check the tax assumptions and try again."),
          },
        },
        { status: response.status },
      );
    }
    return Response.json(payload);
  } catch {
    return Response.json(
      {
        error: {
          code: "ENGINE_UNREACHABLE",
          message: "The income-tax engine could not be reached. Please try again shortly.",
        },
      },
      { status: 503 },
    );
  }
}
