import { z } from "zod";
export const NICKNAME_MAX_LENGTH = 12;
export const familyNicknameSchema = z.string().trim()
  .min(2, "Use a nickname with at least 2 characters.")
  .max(NICKNAME_MAX_LENGTH, "Keep your nickname to 12 characters or fewer.")
  .refine(value => !/\s/.test(value), "Use one nickname or first name, without a surname.");
