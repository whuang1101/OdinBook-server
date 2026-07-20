const IMDS_URL =
  "http://169.254.169.254/metadata/instance/compute?api-version=2025-04-07";
const RETAIL_PRICES_URL = "https://prices.azure.com/api/retail/prices";
const CACHE_TTL_MS = 10 * 60 * 1000;
const HOURS_PER_MONTH = 730;

let cache;

function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}

function isStandardLinuxConsumption(item, metadata) {
  return (
    item &&
    item.armSkuName === metadata.vmSize &&
    item.armRegionName === metadata.location &&
    item.type === "Consumption" &&
    item.unitOfMeasure === "1 Hour" &&
    item.isPrimaryMeterRegion === true &&
    !/windows|spot|low priority/i.test(
      `${item.productName || ""} ${item.meterName || ""}`,
    )
  );
}

async function fetchJson(fetcher, url, options = {}) {
  const response = await fetcher(url, {
    ...options,
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) {
    throw new Error(`Evidence source returned ${response.status}`);
  }
  return response.json();
}

async function getInfrastructureEvidence(fetcher = fetch, now = Date.now()) {
  if (cache && cache.expiresAt > now) return cache.value;

  const metadata = await fetchJson(fetcher, IMDS_URL, {
    headers: { Metadata: "true" },
  });
  if (
    !metadata ||
    !metadata.name ||
    !metadata.location ||
    !metadata.resourceGroupName ||
    !metadata.vmSize ||
    !metadata.osType
  ) {
    throw new Error("Azure instance metadata was incomplete");
  }

  const pricesUrl = new URL(RETAIL_PRICES_URL);
  pricesUrl.searchParams.set(
    "$filter",
    [
      `armRegionName eq '${metadata.location}'`,
      `armSkuName eq '${metadata.vmSize}'`,
      "priceType eq 'Consumption'",
    ].join(" and "),
  );
  const prices = await fetchJson(fetcher, pricesUrl.toString());
  const meter = Array.isArray(prices.Items)
    ? prices.Items.find((item) => isStandardLinuxConsumption(item, metadata))
    : undefined;

  const evidence = {
    provider: "azure",
    collectedAt: new Date(now).toISOString(),
    compute: {
      name: metadata.name,
      location: metadata.location,
      resourceGroup: metadata.resourceGroupName,
      vmSize: metadata.vmSize,
      osType: metadata.osType,
    },
    pricing: meter
      ? {
          source: "azure-retail-prices",
          coverage: "compute-only",
          currency: meter.currencyCode || "USD",
          hourlyRate: meter.retailPrice,
          projectedMonthly: roundCurrency(meter.retailPrice * HOURS_PER_MONTH),
          hoursPerMonth: HOURS_PER_MONTH,
        }
      : null,
  };

  cache = { expiresAt: now + CACHE_TTL_MS, value: evidence };
  return evidence;
}

module.exports = {
  getInfrastructureEvidence,
  isStandardLinuxConsumption,
};
