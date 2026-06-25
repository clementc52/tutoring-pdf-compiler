import express from "express";
import cors from "cors";
import fs from "fs/promises";
import https from "https";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/", (req, res) => {
  res.send("PDF compiler online");
});

async function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const file = require("fs").createWriteStream(destination);

    https.get(url, response => {
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on("finish", () => {
        file.close(resolve);
      });
    }).on("error", reject);
  });
}

app.post("/compile", async (req, res) => {
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

    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "latex-")
    );

    const texPath = path.join(tempDir, "document.tex");

    await fs.writeFile(
      texPath,
      latex,
      "utf8"
    );

    for (const image of imageDownloads) {
  await downloadFile(
    image.url,
    path.join(tempDir, image.filename)
  );
}

    await execFileAsync(
      "pdflatex",
      [
        "-interaction=nonstopmode",
        "-halt-on-error",
        "document.tex",
      ],
      {
        cwd: tempDir,
      }
    );

    const pdfPath = path.join(
      tempDir,
      "document.pdf"
    );

    const pdfBuffer = await fs.readFile(pdfPath);

    const pdfBase64 = pdfBuffer.toString("base64");

    res.json({
      success: true,
      pdfBase64,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: String(err),
    });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("running");
});
