import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-ui-contract.mjs");
import fs from "node:fs";
import path from "node:path";
import { manifest } from "../src/project/project.manifest.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function stripCommentsKeepIndices(text) {
  let out = "";
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let escape = false;
  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1] || "";

    if (escape) {
      out += ch;
      escape = false;
      i += 1;
      continue;
    }

    if (inSingle || inDouble || inTemplate) {
      out += ch;
      if (ch === "\\") {
        escape = true;
      } else if (inSingle && ch === "'") {
        inSingle = false;
      } else if (inDouble && ch === '"') {
        inDouble = false;
      } else if (inTemplate && ch === "`") {
        inTemplate = false;
      }
      i += 1;
      continue;
    }

    if (ch === "/" && next === "/") {
      out += "  ";
      i += 2;
      while (i < text.length && text[i] !== "\n") {
        out += " ";
        i += 1;
      }
      continue;
    }
    if (ch === "/" && next === "*") {
      out += "  ";
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) {
        out += " ";
        i += 1;
      }
      if (i < text.length) {
        out += "  ";
        i += 2;
      }
      continue;
    }

    if (ch === "'") inSingle = true;
    if (ch === '"') inDouble = true;
    if (ch === "`") inTemplate = true;

    out += ch;
    i += 1;
  }

  return out;
}

function maskStringsKeepIndices(text) {
  let out = "";
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let escape = false;
  while (i < text.length) {
    const ch = text[i];
    if (escape) {
      out += " ";
      escape = false;
      i += 1;
      continue;
    }
    if (inSingle) {
      if (ch === "\\") {
        out += " ";
        escape = true;
      } else if (ch === "'") {
        out += "'";
        inSingle = false;
      } else {
        out += " ";
      }
      i += 1;
      continue;
    }
    if (inDouble) {
      if (ch === "\\") {
        out += " ";
        escape = true;
      } else if (ch === '"') {
        out += '"';
        inDouble = false;
      } else {
        out += " ";
      }
      i += 1;
      continue;
    }
    if (inTemplate) {
      if (ch === "\\") {
        out += " ";
        escape = true;
      } else if (ch === "`") {
        out += "`";
        inTemplate = false;
      } else {
        out += " ";
      }
      i += 1;
      continue;
    }
    if (ch === "'") {
      out += "'";
      inSingle = true;
      i += 1;
      continue;
    }
    if (ch === '"') {
      out += '"';
      inDouble = true;
      i += 1;
      continue;
    }
    if (ch === "`") {
      out += "`";
      inTemplate = true;
      i += 1;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

function findBalancedSlice(text, openIndex, openChar, closeChar) {
  let depth = 0;
  let i = openIndex;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let escape = false;
  for (; i < text.length; i += 1) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inSingle || inDouble || inTemplate) {
      if (ch === "\\") {
        escape = true;
      } else if (inSingle && ch === "'") {
        inSingle = false;
      } else if (inDouble && ch === '"') {
        inDouble = false;
      } else if (inTemplate && ch === "`") {
        inTemplate = false;
      }
      continue;
    }
    if (ch === "'") {
      inSingle = true;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      continue;
    }
    if (ch === "`") {
      inTemplate = true;
      continue;
    }
    if (ch === openChar) depth += 1;
    if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) return text.slice(openIndex, i + 1);
    }
  }
  return "";
}

function findBalancedObjectSlice(text, openBraceIndex) {
  return findBalancedSlice(text, openBraceIndex, "{", "}");
}

function extractDispatchTypes(code) {
  const clean = stripCommentsKeepIndices(code);
  const masked = maskStringsKeepIndices(clean);
  const out = new Set();
  const callRe = /\b(?:this\._dispatch|store\.dispatch|dispatch)\s*\(\s*\{/g;
  let call;
  while ((call = callRe.exec(masked))) {
    const openBrace = masked.indexOf("{", call.index);
    if (openBrace < 0) continue;
    const obj = findBalancedObjectSlice(clean, openBrace);
    if (!obj) continue;
    const m = /\btype\s*:\s*"([A-Z0-9_]+)"/.exec(obj);
    if (m) out.add(m[1]);
  }

  const loopRe = /for\s*\(\s*const\s+([A-Za-z_$][\w$]*)\s+of\s+([A-Za-z_$][\w$]*)\s*\)\s*\{/g;
  let loop;
  while ((loop = loopRe.exec(masked))) {
    const itemVar = loop[1];
    const listVar = loop[2];
    const blockStart = masked.indexOf("{", loop.index);
    if (blockStart < 0) continue;
    const block = findBalancedObjectSlice(clean, blockStart);
    if (!block) continue;
    const dynamicDispatchRe = new RegExp(
      `\\b(?:this\\._dispatch|store\\.dispatch|dispatch)\\s*\\(\\s*\\{[\\s\\S]{0,240}?\\btype\\s*:\\s*${itemVar}\\.type\\b`,
    );
    if (!dynamicDispatchRe.test(block)) continue;

    const declRe = new RegExp(`\\bconst\\s+${listVar}\\s*=\\s*\\[`);
    const beforeLoopMasked = masked.slice(0, loop.index);
    const beforeLoopClean = clean.slice(0, loop.index);
    const declMatch = declRe.exec(beforeLoopMasked);
    if (!declMatch) continue;
    const arrayOpen = beforeLoopMasked.indexOf("[", declMatch.index);
    if (arrayOpen < 0) continue;
    const arr = findBalancedSlice(beforeLoopClean, arrayOpen, "[", "]");
    if (!arr) continue;

    const typeRe = /\btype\s*:\s*"([A-Z0-9_]+)"/g;
    let tm;
    while ((tm = typeRe.exec(arr))) out.add(tm[1]);
  }

  return [...out].sort();
}

const UI_REL = "src/game/ui/ui.js";
const MAIN_REL = "src/app/main.js";
const uiPath = path.resolve(UI_REL);
const mainPath = path.resolve(MAIN_REL);

const uiTypes = extractDispatchTypes(read(uiPath));
const mainTypes = extractDispatchTypes(read(mainPath));
const allSourceTypes = [...new Set([...uiTypes, ...mainTypes])].sort();

for (const type of allSourceTypes) {
  assert(manifest.actionSchema?.[type], `UI_CONTRACT_FAIL action=${type} missing actionSchema entry`);
  assert(manifest.mutationMatrix?.[type], `UI_CONTRACT_FAIL action=${type} missing mutationMatrix entry`);
  const dataflow = manifest.dataflow?.actions?.[type];
  assert(dataflow && typeof dataflow === "object", `UI_CONTRACT_FAIL action=${type} missing dataflow.actions entry`);
  const sources = Array.isArray(dataflow.dispatchSources) ? dataflow.dispatchSources : [];
  if (uiTypes.includes(type)) {
    assert(sources.includes(UI_REL), `UI_CONTRACT_FAIL action=${type} missing dispatchSources '${UI_REL}'`);
  }
  if (mainTypes.includes(type)) {
    assert(sources.includes(MAIN_REL), `UI_CONTRACT_FAIL action=${type} missing dispatchSources '${MAIN_REL}'`);
  }
}

for (const [type, entry] of Object.entries(manifest.dataflow?.actions || {})) {
  const sources = Array.isArray(entry?.dispatchSources) ? entry.dispatchSources : [];
  if (sources.includes(UI_REL)) {
    assert(uiTypes.includes(type), `UI_CONTRACT_FAIL dispatchSources claims '${UI_REL}' emits ${type}, but no matching dispatch(...) was found`);
  }
  if (sources.includes(MAIN_REL)) {
    assert(mainTypes.includes(type), `UI_CONTRACT_FAIL dispatchSources claims '${MAIN_REL}' emits ${type}, but no matching dispatch(...) was found`);
  }
}

console.log(`UI_CONTRACT_OK dispatch-level source<->manifest checks ui=${uiTypes.length} main=${mainTypes.length}`);
