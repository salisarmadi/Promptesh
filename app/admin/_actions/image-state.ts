type FieldKey = "url" | "title" | "model" | "width" | "height" | "prompt";

export type ImageFormState = {
  status: "idle" | "saved" | "error";
  message: string;
  fieldErrors: Partial<Record<FieldKey, string>>;
};

export const IMAGE_FORM_INITIAL_STATE: ImageFormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};
