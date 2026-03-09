import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .email({ message: "Invalid email address" })
  .max(255, { message: "Email must be less than 255 characters" });

export const optionalEmailSchema = z
  .string()
  .trim()
  .refine((val) => val === "" || emailSchema.safeParse(val).success, {
    message: "Invalid email address",
  });

export const addressSchema = z
  .string()
  .trim()
  .max(500, { message: "Address must be less than 500 characters" });

export const optionalAddressSchema = z
  .string()
  .trim()
  .max(500, { message: "Address must be less than 500 characters" });

/** Validate an optional email field. Returns error message or null. */
export function validateEmail(value: string): string | null {
  if (!value.trim()) return null; // optional
  const result = emailSchema.safeParse(value);
  return result.success ? null : result.error.errors[0]?.message ?? "Invalid email";
}

/** Validate an optional address field. Returns error message or null. */
export function validateAddress(value: string): string | null {
  if (!value.trim()) return null;
  const result = addressSchema.safeParse(value);
  return result.success ? null : result.error.errors[0]?.message ?? "Invalid address";
}

/** Validate required email. Returns error message or null. */
export function validateRequiredEmail(value: string): string | null {
  if (!value.trim()) return "Email is required";
  const result = emailSchema.safeParse(value);
  return result.success ? null : result.error.errors[0]?.message ?? "Invalid email";
}
