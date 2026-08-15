import { describe, expect, it } from "vitest";
import { PAY_TO, assertCanonicalPayTo } from "../src/payto.js";
import { createPaidRadar } from "../src/paid.js";
import { forbiddenFacilitator } from "./support.js";

describe("assertCanonicalPayTo", () => {
  it("accepts the canonical treasury address", () => {
    expect(() => assertCanonicalPayTo(PAY_TO)).not.toThrow();
  });

  it("rejects any other address", () => {
    expect(() => assertCanonicalPayTo("0x0000000000000000000000000000000000000001")).toThrow(
      /payTo must be/,
    );
  });
});

describe("createPaidRadar payTo guard", () => {
  it("rejects a non-canonical payTo at construction", async () => {
    await expect(
      createPaidRadar({
        payTo: "0x0000000000000000000000000000000000000001",
        facilitator: forbiddenFacilitator(),
      }),
    ).rejects.toThrow(/payTo must be/);
  });
});
