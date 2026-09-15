import test from "node:test";
import assert from "node:assert/strict";

import { calculateFairPrice } from "../src/utils/calculateFairPrice.js";
import { searchWatchModel, getUsdToInrRate } from "../src/services/watchPriceService.js";

test("fair price calculation identifies overvaluation correctly", () => {
  const result = calculateFairPrice({
    currentPrice: 1000000,
    condition: "Excellent",
    rarity: "Medium",
    priceHistory: [
      { price: 900000, recorded_at: "2024-01-01T00:00:00.000Z" },
      { price: 950000, recorded_at: "2024-02-01T00:00:00.000Z" }
    ],
    category: "Luxury Watches"
  });

  assert.equal(result.valuationStatus, "overvalued");
  assert.ok(result.fairPrice > 0);
  assert.equal(result.factors.condition, "Excellent");
});

test("watch lookup returns null when the upstream API rejects the request", async () => {
  const originalFetch = global.fetch;

  global.fetch = async () => ({
    ok: false,
    status: 401,
    statusText: "Unauthorized",
    text: async () => "Unauthorized"
  });

  try {
    const watchResult = await searchWatchModel("Rolex", "Submariner");
    const fxResult = await getUsdToInrRate();

    assert.equal(watchResult, null);
    assert.equal(fxResult, null);
  } finally {
    global.fetch = originalFetch;
  }
});
