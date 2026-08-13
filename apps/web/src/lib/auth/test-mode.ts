export const TEST_ACCOUNT_COOKIE = "ripplelab-test-account";
export const TEST_SESSION_COOKIE = "ripplelab-test-session";

export function isAuthTestMode() {
  return process.env.NODE_ENV !== "production" && process.env.RIPPLELAB_AUTH_TEST_MODE === "1";
}
