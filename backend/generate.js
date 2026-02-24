const path = require("node:path");
const { mkdir, writeFile, readFile, access } = require("node:fs/promises");
const { execFile } = require("node:child_process");
const { setTimeout: sleep } = require("node:timers/promises");
const { promisify } = require("node:util");

const cors = require("cors");
const ExcelJS = require("exceljs");
const express = require("express");
const QRCode = require("qrcode");
const Replicate = require("replicate");

if (typeof process.loadEnvFile === "function") {
  process.loadEnvFile(path.join(__dirname, ".env"));
} else {
  try {
    // Fallback for Node versions without process.loadEnvFile.
    require("dotenv").config({ path: path.join(__dirname, ".env") });
  } catch (dotenvError) {
    console.warn("dotenv load skipped:", dotenvError.message);
  }
}

const execFileAsync = promisify(execFile);

const APP_PORT = Number(process.env.PORT || 8787);
const APP_HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") || "";

const CITY_IMAGE_URL =
  "https://ggqshwzqhewmocwetxth.supabase.co/storage/v1/object/public/Mirax/City.png";
const MIRAX_IMAGE_URL =
  "https://ggqshwzqhewmocwetxth.supabase.co/storage/v1/object/public/Mirax/Mirax.png";

const GENERATED_DIR = path.join(__dirname, "generated");
const DATA_DIR = path.join(__dirname, "data");
const REGISTRATIONS_XLSX_PATH = path.join(DATA_DIR, "registrations.xlsx");

const REPLICATE_MODEL = "google/nano-banana-pro";
const OUTPUT_FORMAT = "png";
const OUTPUT_ASPECT_RATIO = "4:3";
const PREDICTION_POLL_INTERVAL_MS = Number(process.env.PREDICTION_POLL_INTERVAL_MS || 1200);
const PREDICTION_TIMEOUT_MS = Number(process.env.PREDICTION_TIMEOUT_MS || 300000);

const OPTIMIZED_PROMPT = [
  "Create one 4:3 whimsical illustration by combining exactly three references.",
  "Reference priority: #1 child drawing is highest priority (main subject, style, and composition).",
  "Preserve the unique lines, color palette, proportions, and hand-drawn imperfections from reference #1.",
  "Reference #2 city image must only shape the background environment, depth, and perspective.",
  "Reference #3 Mirax must appear beside the main subject as a friendly companion at natural scale.",
  "Keep an illustrated look; do not produce photorealism.",
  "Output should be clean, vibrant, and readable with soft depth and no clutter.",
  "No text, no watermark, no logos, no signatures, no extra characters.",
].join(" ");

function normalizeToken(rawToken) {
  const token = rawToken?.trim();

  if (!token) {
    return "";
  }

  if (token.startsWith("<") && token.endsWith(">")) {
    return token.slice(1, -1).trim();
  }

  return token;
}

const REPLICATE_API_TOKEN = normalizeToken(process.env.REPLICATE_API_TOKEN);

const replicate = REPLICATE_API_TOKEN ? new Replicate({ auth: REPLICATE_API_TOKEN }) : null;

function toSafePhone(phoneValue) {
  return String(phoneValue || "")
    .trim()
    .replace(/[\u06F0-\u06F9]/g, (digit) => String(digit.charCodeAt(0) - 1728))
    .replace(/[^\d+]/g, "");
}

function getFileTimestamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  const millisecond = String(date.getMilliseconds()).padStart(3, "0");

  return `${year}${month}${day}-${hour}${minute}${second}${millisecond}`;
}

function resolvePublicBaseUrl(req) {
  if (PUBLIC_BASE_URL) {
    return PUBLIC_BASE_URL;
  }

  return `${req.protocol}://${req.get("host")}`;
}

function toPublicFileUrl(req, fileName) {
  return `${resolvePublicBaseUrl(req)}/generated/${encodeURIComponent(fileName)}`;
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureStorage() {
  await mkdir(GENERATED_DIR, { recursive: true });
  await mkdir(DATA_DIR, { recursive: true });
}

function extractOutputUrl(output) {
  const first = Array.isArray(output) ? output[0] : output;

  if (!first) {
    throw new Error("Model returned no output.");
  }

  if (typeof first === "string") {
    return first;
  }

  if (typeof first.url === "function") {
    const value = first.url();
    return typeof value === "string" ? value : value.toString();
  }

  if (typeof first.url === "string") {
    return first.url;
  }

  return String(first);
}

async function downloadModelOutput(sourceUrl) {
  const authHeaders = REPLICATE_API_TOKEN
    ? { Authorization: `Bearer ${REPLICATE_API_TOKEN}` }
    : undefined;

  let response = await fetch(sourceUrl, {
    headers: authHeaders,
  });

  if (!response.ok && authHeaders) {
    response = await fetch(sourceUrl);
  }

  if (!response.ok) {
    throw new Error(`Unable to download generated file: ${response.status} ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function toPowerShellLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function downloadWithPowerShell(sourceUrl, filePath) {
  const script = [
    "$ProgressPreference = 'SilentlyContinue'",
    `Invoke-WebRequest -UseBasicParsing -Uri ${toPowerShellLiteral(sourceUrl)} -OutFile ${toPowerShellLiteral(filePath)}`,
  ].join("; ");

  await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
    { windowsHide: true },
  );
}

async function saveModelOutputToFile(sourceUrl, filePath) {
  try {
    const imageBuffer = await downloadModelOutput(sourceUrl);
    await writeFile(filePath, imageBuffer);
    return "fetch";
  } catch (fetchError) {
    if (process.platform !== "win32") {
      throw fetchError;
    }

    try {
      await downloadWithPowerShell(sourceUrl, filePath);
      return "powershell";
    } catch (powerShellError) {
      throw new Error(
        `Download failed with fetch (${fetchError.message}) and PowerShell fallback (${powerShellError.message}).`,
      );
    }
  }
}

let excelQueue = Promise.resolve();

async function appendRegistrationRow(rowData) {
  excelQueue = excelQueue.then(async () => {
    const workbook = new ExcelJS.Workbook();

    if (await fileExists(REGISTRATIONS_XLSX_PATH)) {
      await workbook.xlsx.readFile(REGISTRATIONS_XLSX_PATH);
    }

    let worksheet = workbook.getWorksheet("registrations");

    if (!worksheet) {
      worksheet = workbook.addWorksheet("registrations");
      worksheet.columns = [
        { header: "created_at", key: "created_at", width: 24 },
        { header: "generation_id", key: "generation_id", width: 24 },
        { header: "phone", key: "phone", width: 20 },
        { header: "image_url", key: "image_url", width: 64 },
        { header: "qr_code_url", key: "qr_code_url", width: 64 },
        { header: "qr_payload", key: "qr_payload", width: 64 },
      ];
    }

    worksheet.addRow(rowData);
    await workbook.xlsx.writeFile(REGISTRATIONS_XLSX_PATH);
  });

  return excelQueue;
}

async function runGeneration(photoDataUrl) {
  if (!replicate) {
    throw new Error("REPLICATE_API_TOKEN is missing. Set it in backend/.env");
  }

  const input = {
    prompt: OPTIMIZED_PROMPT,
    image_input: [photoDataUrl, CITY_IMAGE_URL, MIRAX_IMAGE_URL],
    aspect_ratio: OUTPUT_ASPECT_RATIO,
    output_format: OUTPUT_FORMAT,
  };

  let prediction = await replicate.predictions.create({
    model: REPLICATE_MODEL,
    input,
  });

  const deadline = Date.now() + PREDICTION_TIMEOUT_MS;

  while (Date.now() < deadline) {
    prediction = await replicate.predictions.get(prediction.id);

    if (prediction.status === "succeeded") {
      return {
        predictionId: prediction.id,
        outputUrl: extractOutputUrl(prediction.output),
      };
    }

    if (prediction.status === "failed" || prediction.status === "canceled" || prediction.status === "aborted") {
      throw new Error(`Prediction ${prediction.status}: ${prediction.error || "No details"}`);
    }

    await sleep(PREDICTION_POLL_INTERVAL_MS);
  }

  throw new Error(`Prediction timed out after ${PREDICTION_TIMEOUT_MS}ms.`);
}

async function startServer() {
  await ensureStorage();

  const app = express();

  app.set("trust proxy", true);
  app.use(cors());
  app.use(express.json({ limit: "25mb" }));
  app.use("/generated", express.static(GENERATED_DIR));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/generate", async (req, res) => {
    try {
      const { photoDataUrl } = req.body || {};

      if (!photoDataUrl || typeof photoDataUrl !== "string") {
        return res.status(400).json({ error: "photoDataUrl is required." });
      }

      if (!photoDataUrl.startsWith("data:image")) {
        return res.status(400).json({ error: "photoDataUrl must be a data URL image." });
      }

      const createdAt = new Date();
      const generationId = `mirax-${getFileTimestamp(createdAt)}`;
      const generatedImageName = `${generationId}.png`;
      const qrCodeName = `${generationId}-qr.png`;
      const metadataName = `${generationId}.json`;
      const imageFilePath = path.join(GENERATED_DIR, generatedImageName);

      const generationResult = await runGeneration(photoDataUrl);
      const outputUrl = generationResult.outputUrl;
      const downloadMethod = await saveModelOutputToFile(outputUrl, imageFilePath);

      const imageUrl = toPublicFileUrl(req, generatedImageName);
      const qrPayload = imageUrl;
      const qrCodeFilePath = path.join(GENERATED_DIR, qrCodeName);

      await QRCode.toFile(qrCodeFilePath, qrPayload, {
        width: 700,
        margin: 1,
      });

      const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
        width: 340,
        margin: 1,
      });

      const qrCodeUrl = toPublicFileUrl(req, qrCodeName);

      const metadata = {
        generationId,
        createdAt: createdAt.toISOString(),
        imageName: generatedImageName,
        imageUrl,
        qrCodeName,
        qrCodeUrl,
        qrPayload,
        replicatePredictionId: generationResult.predictionId,
        replicateOutputUrl: outputUrl,
        downloadMethod,
      };

      const metadataPath = path.join(GENERATED_DIR, metadataName);
      await writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf8");

      return res.status(201).json({
        generationId,
        createdAt: metadata.createdAt,
        imageUrl,
        qrCodeUrl,
        qrCodeDataUrl,
      });
    } catch (error) {
      console.error("Generation failed:", error);
      return res.status(500).json({
        error: "Generation failed.",
        details: error.message,
      });
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      const { generationId, phone } = req.body || {};

      if (!generationId || typeof generationId !== "string") {
        return res.status(400).json({ error: "generationId is required." });
      }

      const normalizedPhone = toSafePhone(phone);

      if (!normalizedPhone || normalizedPhone.length < 8) {
        return res.status(400).json({ error: "A valid phone number is required." });
      }

      const metadataPath = path.join(GENERATED_DIR, `${generationId}.json`);

      if (!(await fileExists(metadataPath))) {
        return res.status(404).json({ error: "Generation record not found." });
      }

      const metadata = JSON.parse(await readFile(metadataPath, "utf8"));

      await appendRegistrationRow({
        created_at: new Date().toISOString(),
        generation_id: generationId,
        phone: normalizedPhone,
        image_url: metadata.imageUrl,
        qr_code_url: metadata.qrCodeUrl,
        qr_payload: metadata.qrPayload,
      });

      return res.status(201).json({
        success: true,
        generationId,
        phone: normalizedPhone,
        qrCodeUrl: metadata.qrCodeUrl,
        qrCodeDataUrl: await QRCode.toDataURL(metadata.qrPayload, {
          width: 340,
          margin: 1,
        }),
      });
    } catch (error) {
      console.error("Register failed:", error);
      return res.status(500).json({
        error: "Register failed.",
        details: error.message,
      });
    }
  });

  app.listen(APP_PORT, APP_HOST, () => {
    console.log(`Mirax backend running on http://${APP_HOST}:${APP_PORT}`);
    console.log(`Generated files are served from /generated`);

    if (!REPLICATE_API_TOKEN) {
      console.warn("REPLICATE_API_TOKEN is not configured. /api/generate will fail until token is set.");
    }
  });
}

startServer().catch((error) => {
  console.error("Server failed to start:", error);
  process.exitCode = 1;
});
