const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getInfrastructureEvidence,
  isStandardLinuxConsumption,
} = require("../lib/infrastructure");

const metadata = {
  name: "learning-vm",
  location: "eastus2",
  resourceGroupName: "eustesting",
  vmSize: "Standard_B2s",
  osType: "Linux",
  subscriptionId: "must-not-leak",
};

const linuxMeter = {
  armSkuName: "Standard_B2s",
  armRegionName: "eastus2",
  type: "Consumption",
  unitOfMeasure: "1 Hour",
  isPrimaryMeterRegion: true,
  productName: "Virtual Machines BS Series",
  meterName: "B2s",
  currencyCode: "USD",
  retailPrice: 0.0416,
};

test("selects only the primary Linux consumption meter", () => {
  assert.equal(isStandardLinuxConsumption(linuxMeter, metadata), true);
  assert.equal(
    isStandardLinuxConsumption(
      { ...linuxMeter, productName: "Virtual Machines BS Series Windows" },
      metadata,
    ),
    false,
  );
  assert.equal(
    isStandardLinuxConsumption({ ...linuxMeter, meterName: "B2s Spot" }, metadata),
    false,
  );
});

test("allow-lists Azure metadata and computes a transparent monthly estimate", async () => {
  const calls = [];
  const fetcher = async (url, options = {}) => {
    calls.push({ url: String(url), headers: options.headers || {} });
    if (String(url).startsWith("http://169.254.169.254/")) {
      return new Response(JSON.stringify(metadata), { status: 200 });
    }
    return new Response(JSON.stringify({ Items: [linuxMeter] }), { status: 200 });
  };

  const evidence = await getInfrastructureEvidence(
    fetcher,
    Date.parse("2026-07-20T12:00:00Z"),
  );

  assert.deepEqual(evidence.compute, {
    name: "learning-vm",
    location: "eastus2",
    resourceGroup: "eustesting",
    vmSize: "Standard_B2s",
    osType: "Linux",
  });
  assert.equal(evidence.pricing.projectedMonthly, 30.37);
  assert.equal(evidence.pricing.coverage, "compute-only");
  assert.equal("subscriptionId" in evidence.compute, false);
  assert.equal(calls[0].headers.Metadata, "true");
  assert.match(calls[1].url, /armSkuName/);
});
