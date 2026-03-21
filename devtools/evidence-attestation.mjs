import fs from "node:fs";
import path from "node:path";
import { createHash, sign, verify } from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const DEFAULT_PRIVATE_KEY_PATH = path.join(root, "devtools", "keys", "evidence-attestation-private.pem");
const DEFAULT_PUBLIC_KEY_PATH = path.join(root, "devtools", "keys", "evidence-attestation-public.pem");
const DEFAULT_ALGO = "ed25519";

function canonicalStringify(value) {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalStringify(item)).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value);
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`).join(",")}}`;
}

export function sha256Buffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function resolveAttestationConfig() {
  const privateKeyPath = process.env.EVIDENCE_ATTEST_PRIVATE_KEY_PATH
    ? path.resolve(root, process.env.EVIDENCE_ATTEST_PRIVATE_KEY_PATH)
    : DEFAULT_PRIVATE_KEY_PATH;
  const publicKeyPath = process.env.EVIDENCE_ATTEST_PUBLIC_KEY_PATH
    ? path.resolve(root, process.env.EVIDENCE_ATTEST_PUBLIC_KEY_PATH)
    : DEFAULT_PUBLIC_KEY_PATH;
  const algorithm = String(process.env.EVIDENCE_ATTEST_ALGO || DEFAULT_ALGO).toLowerCase();
  return { privateKeyPath, publicKeyPath, algorithm };
}

function keyIdFromPublicKey(publicKeyPem) {
  return sha256Buffer(Buffer.from(publicKeyPem, "utf8")).slice(0, 16);
}

export function createEvidenceAttestation({ manifestPath, commitSha, runId, suite, outcome, verificationPolicy }) {
  const cfg = resolveAttestationConfig();
  const manifestBytes = fs.readFileSync(manifestPath);
  const manifestSha256 = sha256Buffer(manifestBytes);
  const publicKeyPem = fs.readFileSync(cfg.publicKeyPath, "utf8");
  const privateKeyPem = fs.readFileSync(cfg.privateKeyPath, "utf8");
  const keyId = keyIdFromPublicKey(publicKeyPem);

  const payload = {
    version: 1,
    algorithm: cfg.algorithm,
    keyId,
    commitSha: String(commitSha || "unknown"),
    runId: String(runId || ""),
    suite: String(suite || ""),
    outcome: String(outcome || ""),
    verificationPolicy: verificationPolicy || {},
    manifestSha256,
    attestedAt: new Date().toISOString(),
  };
  const payloadBytes = Buffer.from(canonicalStringify(payload), "utf8");
  const signature = sign(null, payloadBytes, privateKeyPem).toString("base64");
  return {
    ...payload,
    signature,
  };
}

export function verifyEvidenceAttestation({ attestation, manifestPath }) {
  const cfg = resolveAttestationConfig();
  const publicKeyPem = fs.readFileSync(cfg.publicKeyPath, "utf8");
  const expectedKeyId = keyIdFromPublicKey(publicKeyPem);
  if (String(attestation?.keyId || "") !== expectedKeyId) {
    throw new Error(`Attestation key mismatch: expected ${expectedKeyId}, got ${String(attestation?.keyId || "")}`);
  }

  const manifestBytes = fs.readFileSync(manifestPath);
  const manifestSha256 = sha256Buffer(manifestBytes);
  if (String(attestation?.manifestSha256 || "") !== manifestSha256) {
    throw new Error(`Attestation manifest hash mismatch: expected ${manifestSha256}, got ${String(attestation?.manifestSha256 || "")}`);
  }

  const payload = {
    version: Number(attestation.version || 0),
    algorithm: String(attestation.algorithm || ""),
    keyId: String(attestation.keyId || ""),
    commitSha: String(attestation.commitSha || ""),
    runId: String(attestation.runId || ""),
    suite: String(attestation.suite || ""),
    outcome: String(attestation.outcome || ""),
    verificationPolicy: attestation.verificationPolicy || {},
    manifestSha256: String(attestation.manifestSha256 || ""),
    attestedAt: String(attestation.attestedAt || ""),
  };
  const payloadBytes = Buffer.from(canonicalStringify(payload), "utf8");
  const ok = verify(null, payloadBytes, publicKeyPem, Buffer.from(String(attestation?.signature || ""), "base64"));
  if (!ok) throw new Error("Attestation signature verification failed.");
  return {
    ok: true,
    keyId: expectedKeyId,
    manifestSha256,
  };
}
