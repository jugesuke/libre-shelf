/// <reference path="../../worker-configuration.d.ts" />
import { z } from "zod";

export const envSchema = z.object({
  MODE: z.enum(["dev", "prod"]),
});

type EnvValidated = z.infer<typeof envSchema>;

export type Bindings = {
  Bindings: EnvValidated;
};
