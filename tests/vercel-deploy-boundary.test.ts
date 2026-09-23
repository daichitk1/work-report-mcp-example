import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

/**
 * Git pushだけではVercel deploymentを作成しない。
 * Preview / Productionは必要なときだけ明示的にdeployする。
 */
test("Vercel Git automatic deployments stay disabled", async () => {
  const config = JSON.parse(await readFile("vercel.json", "utf8")) as {
    git?: { deploymentEnabled?: boolean };
  };

  assert.equal(
    config.git?.deploymentEnabled,
    false,
    "Git pushes must not create automatic Vercel Preview or Production deployments",
  );
});
