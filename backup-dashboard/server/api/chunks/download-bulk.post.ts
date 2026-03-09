import { strToU8, zipSync } from "fflate";
import { readFileSync } from "fs";
import { resolve } from "path";
import type { ChunksResponse } from "~/types";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ chunkIds: string[] }>(event);
  const { chunkIds } = body;

  if (!chunkIds || !Array.isArray(chunkIds) || chunkIds.length === 0) {
    throw createError({
      statusCode: 400,
      message: "chunkIds array is required",
    });
  }

  const dataPath = resolve(process.cwd(), "mock-data/signedfiles.json");
  const data: ChunksResponse = JSON.parse(readFileSync(dataPath, "utf-8"));
  const allChunks = data.groups.flatMap((g) => g.chunks);
  const selected = allChunks.filter((c) => chunkIds.includes(c.id));

  if (selected.length === 0) {
    throw createError({ statusCode: 404, message: "No matching chunks found" });
  }

  const files: Record<string, Uint8Array> = {};

  for (const chunk of selected) {
    const content = JSON.stringify(
      {
        chunkId: chunk.id,
        timestamp: chunk.timestamp,
        hour: chunk.hour,
        minute: chunk.minute,
        dataCount: chunk.dataCount,
        sizeBytes: chunk.sizeBytes,
        compressionRatio: chunk.compressionRatio,
        checksum: chunk.checksum,
        status: chunk.status,
        records: Array.from(
          { length: Math.min(chunk.dataCount, 100) },
          (_, i) => ({
            seq: i,
            ts: new Date(
              new Date(chunk.timestamp).getTime() + i * 600
            ).toISOString(),
            src: `10.${(chunk.hour * 7 + i) % 255}.${
              (chunk.minute * 3 + i) % 255
            }.${i % 255}`,
            dst: `192.168.${chunk.hour % 16}.${((chunk.minute + i) % 254) + 1}`,
            proto: ["TCP", "UDP", "ICMP", "DNS"][i % 4],
            port: [80, 443, 22, 53, 8080, 3389][i % 6],
            action: i % 7 === 0 ? "DENY" : "ALLOW",
            bytes: Math.floor(chunk.sizeBytes / chunk.dataCount),
          })
        ),
      },
      null,
      2
    );

    const fileName = `${String(chunk.hour).padStart(2, "0")}h${String(
      chunk.minute
    ).padStart(2, "0")}m_${chunk.id}.json`;
    files[fileName] = strToU8(content);
  }

  const manifest = JSON.stringify(
    {
      date: "2025-01-15",
      exportedAt: new Date().toISOString(),
      totalChunks: selected.length,
      totalRecords: selected.reduce((s, c) => s + c.dataCount, 0),
      totalSizeBytes: selected.reduce((s, c) => s + c.sizeBytes, 0),
      chunks: selected.map((c) => ({
        id: c.id,
        timestamp: c.timestamp,
        dataCount: c.dataCount,
        sizeBytes: c.sizeBytes,
        status: c.status,
      })),
    },
    null,
    2
  );
  files["manifest.json"] = strToU8(manifest);

  const zipped = zipSync(files, { level: 6 });

  const zipName = `chunks_2025-01-15_${selected.length}files.zip`;
  setHeader(event, "Content-Type", "application/zip");
  setHeader(event, "Content-Disposition", `attachment; filename="${zipName}"`);
  setHeader(event, "Content-Length", zipped.byteLength);

  return zipped;
});
