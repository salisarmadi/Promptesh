export type LoginState = {
  error: string;
  kind: "none" | "credentials" | "config" | "throttled";
};

export const LOGIN_INITIAL_STATE: LoginState = { error: "", kind: "none" };
