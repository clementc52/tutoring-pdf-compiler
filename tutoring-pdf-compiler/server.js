import express from "express";
import cors from "cors";
import katex from "katex";
import { parse as parseLatex } from "@unified-latex/unified-latex-util-parse";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const TECTONIC_TIMEOUT_MS = 180_000;
const IMAGE_DOWNLOAD_TIMEOUT_MS = 30_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg"]);

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/", (req, res) => {
  res.send("PDF compiler online");
});

async function downloadFile(url, destination) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(IMAGE_DOWNLOAD_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_IMAGE_BYTES) throw new Error("Image asset is too large.");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("Image asset has an invalid size.");
  }
  await fs.writeFile(destination, buffer);
}

function safeImageFilename(value) {
  const filename = path.basename(String(value));
  const extension = path.extname(filename).slice(1).toLowerCase();
  if (!filename || filename !== String(value) || filename.includes("..") || !IMAGE_EXTENSIONS.has(extension)) {
    throw new Error(`Invalid image asset filename: ${String(value).slice(0, 200)}`);
  }
  return filename;
}

function extractMathSegments(source) {
  const segments = [];
  const add = (content, displayMode, kind) => {
    if (content?.trim()) segments.push({ content: content.trim(), displayMode, kind });
  };
  for (const match of source.matchAll(/\\\[([\s\S]*?)\\\]/g)) add(match[1], true, "\\[...\\]");
  for (const match of source.matchAll(/\\\(([\s\S]*?)\\\)/g)) add(match[1], false, "\\(...\\)");
  for (const match of source.matchAll(/\$\$([\s\S]*?)\$\$/g)) add(match[1], true, "$$...$$");
  for (const match of source.matchAll(/\\begin\{(equation\*?|align\*?|gather\*?|multline\*?)\}([\s\S]*?)\\end\{\1\}/g)) {
    add(["\\begin{aligned}", match[2], "\\end{aligned}"].join("\n"), true, "equation environment");
  }
  let start = -1;
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] !== "$" || source[index - 1] === "\\") continue;
    if (source[index + 1] === "$") { index += 1; continue; }
    if (start < 0) start = index + 1;
    else { add(source.slice(start, index), false, "$...$"); start = -1; }
  }
  return segments;
}

function validateWithKaTeX(source) {
  const segments = extractMathSegments(source);
  for (const [index, segment] of segments.entries()) {
    try {
      katex.renderToString(segment.content, {
        displayMode: segment.displayMode,
        throwOnError: true,
        strict: "error",
        output: "html",
      });
    } catch (error) {
      throw new Error(`[KaTeX] math segment ${index + 1} (${segment.kind}) is invalid: ${error?.message ?? String(error)}`);
    }
  }
  return { segmentsChecked: segments.length };
}

function validateWithUnifiedLatex(source) {
  try {
    const ast = parseLatex(source);
    return { astType: ast?.type ?? "root", topLevelNodes: Array.isArray(ast?.content) ? ast.content.length : 0 };
  } catch (error) {
    throw new Error(`[unified-latex] source could not be parsed: ${error?.message ?? String(error)}`);
  }
}

function commandOutput(error) {
  return [error?.stdout, error?.stderr, error?.message].filter(Boolean).join("\n").slice(0, 12000);
}

async function runChkTeX(texPath, tempDir) {
  try {
    const result = await execFileAsync("chktex", ["-q", "-v0", path.basename(texPath)], {
      cwd: tempDir,
      maxBuffer: 2 * 1024 * 1024,
    });
    return { warnings: result.stdout?.trim() ?? "" };
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error("[ChkTeX] ChkTeX is not installed.");
    return { warnings: commandOutput(error) };
  }
}

async function runTectonic(texPath, tempDir) {
  try {
    await execFileAsync("tectonic", ["--chatter", "minimal", "--keep-logs", "--outdir", tempDir, path.basename(texPath)], {
      cwd: tempDir,
      timeout: TECTONIC_TIMEOUT_MS,
      maxBuffer: 12 * 1024 * 1024,
    });
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error("[Tectonic] Tectonic is not installed.");
    throw new Error(`[Tectonic] compilation failed: ${commandOutput(error)}`);
  }
}

app.post("/compile", async (req, res) => {
  let tempDir = null;
  try {
    const {
  latex,
  imageDownloads = [],
} = req.body;

    if (!latex) {
      return res.status(400).json({
        error: "Missing latex source",
      });
    }

    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "latex-")
    );

    const texPath = path.join(tempDir, "document.tex");

    await fs.writeFile(
      texPath,
      latex,
      "utf8"
    );

    if (!Array.isArray(imageDownloads) || imageDownloads.length > 48) {
      throw new Error("At most 48 image assets are allowed.");
    }

    const downloadedFilenames = new Set();
    for (const image of imageDownloads) {
      if (!image?.url || !image?.filename) continue;
      const filename = safeImageFilename(image.filename);
      if (downloadedFilenames.has(filename)) continue;
      const imageUrl = new URL(String(image.url));
      if (!/^https?:$/.test(imageUrl.protocol)) throw new Error("Image URL must use HTTP or HTTPS.");
      await downloadFile(imageUrl, path.join(tempDir, filename));
      downloadedFilenames.add(filename);
    }

    const katexValidation = validateWithKaTeX(latex);
    const unifiedLatexValidation = validateWithUnifiedLatex(latex);
    const chktexValidation = await runChkTeX(texPath, tempDir);
    await runTectonic(texPath, tempDir);

    const pdfPath = path.join(
      tempDir,
      "document.pdf"
    );

    const pdfBuffer = await fs.readFile(pdfPath);

    const pdfBase64 = pdfBuffer.toString("base64");

    res.json({
      success: true,
      pdfBase64,
      validation: {
        pipeline: ["KaTeX", "unified-latex", "ChkTeX", "Tectonic"],
        katex: katexValidation,
        unifiedLatex: unifiedLatexValidation,
        chktex: chktexValidation,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message ?? "PDF compilation failed.",
      stdout: err.stdout,
      stderr: err.stderr,
    });
  } finally {
    if (tempDir) await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("running");
});
