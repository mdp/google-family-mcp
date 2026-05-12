import type { GoogleClient } from "./google-client.js";

const DRIVE_BASE = "https://www.googleapis.com/drive/v3";
const MAX_READ_CHARS = 50_000;

// --- Types ---

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string | null;
  modifiedTime: string | null;
  size: string | null;
  parents: string[] | null;
}

// --- API Functions ---

export async function driveListFiles(
  client: GoogleClient,
  opts?: {
    folderId?: string;
    maxResults?: number;
  },
): Promise<DriveFile[]> {
  const folderId = opts?.folderId ?? "root";
  const pageSize = opts?.maxResults ?? 20;

  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    pageSize: String(pageSize),
    fields: "files(id,name,mimeType,createdTime,modifiedTime,size,parents)",
    orderBy: "folder,name",
  });

  const data = await client.request<{ files?: RawDriveFile[] }>(
    "GET",
    `${DRIVE_BASE}/files?${params}`,
  );

  return (data.files ?? []).map(mapRawFile);
}

export async function driveSearchFiles(
  client: GoogleClient,
  opts: {
    query: string;
    maxResults?: number;
  },
): Promise<DriveFile[]> {
  const pageSize = opts.maxResults ?? 20;

  const params = new URLSearchParams({
    q: opts.query,
    pageSize: String(pageSize),
    fields: "files(id,name,mimeType,createdTime,modifiedTime,size,parents)",
  });

  const data = await client.request<{ files?: RawDriveFile[] }>(
    "GET",
    `${DRIVE_BASE}/files?${params}`,
  );

  return (data.files ?? []).map(mapRawFile);
}

export async function driveReadFile(
  client: GoogleClient,
  opts: { fileId: string },
): Promise<{ content: string; truncated: boolean }> {
  // First get file metadata to determine type
  const meta = await client.request<RawDriveFile>(
    "GET",
    `${DRIVE_BASE}/files/${opts.fileId}?fields=id,name,mimeType`,
  );

  const mimeType = meta.mimeType ?? "";
  let text: string;

  if (mimeType === "application/vnd.google-apps.document") {
    text = await exportGoogleDoc(client, opts.fileId, "text/plain");
  } else if (mimeType === "application/vnd.google-apps.spreadsheet") {
    text = await exportGoogleDoc(client, opts.fileId, "text/csv");
  } else if (mimeType === "application/vnd.google-apps.presentation") {
    text = await exportGoogleDoc(client, opts.fileId, "text/plain");
  } else {
    text = await downloadFileContent(client, opts.fileId);
  }

  const truncated = text.length > MAX_READ_CHARS;
  return {
    content: truncated ? text.slice(0, MAX_READ_CHARS) : text,
    truncated,
  };
}

export async function driveUploadFile(
  client: GoogleClient,
  opts: {
    name: string;
    content: string;
    mimeType: string;
    folderId?: string;
  },
): Promise<DriveFile> {
  const metadata: Record<string, unknown> = {
    name: opts.name,
    mimeType: opts.mimeType,
  };
  if (opts.folderId) {
    metadata.parents = [opts.folderId];
  }

  // Use multipart upload to send metadata + content together
  const boundary = "-----drive_upload_boundary";
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${opts.mimeType}\r\n\r\n` +
    `${opts.content}\r\n` +
    `--${boundary}--`;

  const token = await client.ensureValidToken();
  const response = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,createdTime,modifiedTime,size,parents`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );

  if (!response.ok) {
    throw new Error(`Drive upload failed (${response.status}).`);
  }

  const raw = (await response.json()) as RawDriveFile;
  return mapRawFile(raw);
}

export async function driveCreateFolder(
  client: GoogleClient,
  opts: {
    name: string;
    parentFolderId?: string;
  },
): Promise<DriveFile> {
  const body: Record<string, unknown> = {
    name: opts.name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (opts.parentFolderId) {
    body.parents = [opts.parentFolderId];
  }

  const params = new URLSearchParams({
    fields: "id,name,mimeType,createdTime,modifiedTime,size,parents",
  });

  const raw = await client.request<RawDriveFile>(
    "POST",
    `${DRIVE_BASE}/files?${params}`,
    body,
  );

  return mapRawFile(raw);
}

// --- Internal helpers ---

interface RawDriveFile {
  id?: string;
  name?: string;
  mimeType?: string;
  createdTime?: string;
  modifiedTime?: string;
  size?: string;
  parents?: string[];
}

function mapRawFile(raw: RawDriveFile): DriveFile {
  return {
    id: raw.id ?? "",
    name: raw.name ?? "",
    mimeType: raw.mimeType ?? "",
    createdTime: raw.createdTime ?? null,
    modifiedTime: raw.modifiedTime ?? null,
    size: raw.size ?? null,
    parents: raw.parents ?? null,
  };
}

async function exportGoogleDoc(
  client: GoogleClient,
  fileId: string,
  exportMimeType: string,
): Promise<string> {
  const token = await client.ensureValidToken();
  const params = new URLSearchParams({ mimeType: exportMimeType });
  const response = await fetch(
    `${DRIVE_BASE}/files/${fileId}/export?${params}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!response.ok) {
    throw new Error(`Drive export failed (${response.status}).`);
  }
  return response.text();
}

async function downloadFileContent(
  client: GoogleClient,
  fileId: string,
): Promise<string> {
  const token = await client.ensureValidToken();
  const response = await fetch(
    `${DRIVE_BASE}/files/${fileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!response.ok) {
    throw new Error(`Drive download failed (${response.status}).`);
  }
  return response.text();
}

export async function driveGetFileBytes(
  client: GoogleClient,
  opts: { fileId: string },
): Promise<{ base64: string; mimeType: string; name: string }> {
  const meta = await client.request<{ id: string; name: string; mimeType: string }>(
    "GET",
    `${DRIVE_BASE}/files/${opts.fileId}?fields=id,name,mimeType`,
  );
  const mimeType = meta.mimeType ?? "application/octet-stream";
  const name = meta.name ?? opts.fileId;

  if (mimeType.startsWith("application/vnd.google-apps.")) {
    const exportMime = mimeType.includes("spreadsheet") ? "text/csv" : "text/plain";
    const text = await exportGoogleDoc(client, opts.fileId, exportMime);
    return { base64: Buffer.from(text, "utf-8").toString("base64"), mimeType: exportMime, name };
  }

  const token = await client.ensureValidToken();
  const response = await fetch(`${DRIVE_BASE}/files/${opts.fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Drive download failed (${response.status}).`);
  const buffer = await response.arrayBuffer();
  return { base64: Buffer.from(buffer).toString("base64"), mimeType, name };
}
