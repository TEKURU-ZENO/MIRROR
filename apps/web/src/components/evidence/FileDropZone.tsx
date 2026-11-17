// FileDropZone.tsx — drag-and-drop + click-to-browse file ingestor

import { useState, useCallback, useRef } from 'react';
import { Image, FileText, File, Upload, AlertTriangle, Loader } from 'lucide-react';
import { db } from '@mirror/sync';
import { generateId, nowISO, sha256Hex, formatBytes } from '@mirror/core';
import type { EvidenceItem, Provenance } from '@mirror/core';

interface FileDropZoneProps {
  inspectionId: string | null;
  onComplete: () => void;
}

type EvidenceType = EvidenceItem['type'];

function inferType(file: File): EvidenceType {
  if (file.type.startsWith('image/')) return 'photo';
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type === 'text/plain' || file.name.endsWith('.txt')) return 'note';
  return 'note';
}

function FileTypeIcon({ file }: { file: File }) {
  if (file.type.startsWith('image/')) return <Image className="w-4 h-4 text-mirror-accent" />;
  if (file.type === 'application/pdf') return <FileText className="w-4 h-4 text-mirror-warning" />;
  return <File className="w-4 h-4 text-mirror-muted" />;
}

export function FileDropZone({ inspectionId, onComplete }: FileDropZoneProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const accepted = Array.from(incoming).filter(
      (f) =>
        f.type.startsWith('image/') ||
        f.type === 'application/pdf' ||
        f.type.startsWith('video/') ||
        f.type === 'text/plain' ||
        f.name.endsWith('.txt'),
    );
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...accepted.filter((f) => !existing.has(f.name + f.size))];
    });
  }, []);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) addFiles(e.target.files);
    },
    [addFiles],
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleIngest = useCallback(async () => {
    if (!inspectionId) return;
    if (files.length === 0) return;
    setIsIngesting(true);
    setError(null);
    try {
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        const checksum = await sha256Hex(buffer);
        const id = generateId();
        const now = nowISO();
        const govId = generateId();

        const evidenceItem: EvidenceItem = {
          id,
          inspectionId,
          type: inferType(file),
          filename: file.name,
          mimeType: file.type || undefined,
          sizeBytes: file.size,
          storageRef: `local://evidence/${id}`,
          capturedAt: now,
          ingestedAt: now,
          checksum,
        };

        const provenance: Provenance = {
          evidenceId: id,
          checksum,
          capturedAt: now,
          capturedBy: 'local-user',
          ingestedAt: now,
          ingestedOnDevice: navigator.userAgent,
          governanceEventIds: [govId],
        };

        await db.evidenceItems.add(evidenceItem);
        await db.provenance.add(provenance);
        await db.governanceEvents.add({
          id: govId,
          occurredAt: now,
          actorId: 'local-user',
          actorType: 'inspector',
          eventType: 'evidence-ingested',
          payload: {
            evidenceId: id,
            filename: file.name,
            checksum,
            inspectionId,
          },
        });
      }
      setFiles([]);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ingestion failed');
    } finally {
      setIsIngesting(false);
    }
  }, [files, inspectionId, onComplete]);

  return (
    <div className="flex flex-col gap-4">
      {!inspectionId && (
        <div className="flex items-center gap-2 rounded-md bg-mirror-warning/10 border border-mirror-warning/40 px-3 py-2 text-mirror-warning text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Select an inspection first
        </div>
      )}

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop files or click to browse"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        className={[
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors',
          isDragging
            ? 'border-mirror-accent bg-mirror-accent/10'
            : 'border-mirror-border hover:border-mirror-accent/60 hover:bg-mirror-accent/5',
        ].join(' ')}
      >
        <Upload className="w-8 h-8 text-mirror-muted" />
        <p className="text-sm text-mirror-text font-medium">
          Drag &amp; drop files here, or click to browse
        </p>
        <p className="text-xs text-mirror-muted">Images, PDFs, text files accepted</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.pdf,text/plain,.txt,video/*"
        className="hidden"
        onChange={onInputChange}
      />

      {/* File list */}
      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${file.size}-${i}`}
              className="flex items-center gap-3 rounded-md bg-mirror-bg border border-mirror-border px-3 py-2"
            >
              <FileTypeIcon file={file} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-mirror-text truncate">{file.name}</p>
                <p className="text-xs text-mirror-muted">
                  {formatBytes(file.size)} · {inferType(file)}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                className="text-mirror-muted hover:text-mirror-danger text-xs px-1"
                aria-label={`Remove ${file.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="text-xs text-mirror-danger flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> {error}
        </p>
      )}

      <button
        type="button"
        disabled={!inspectionId || files.length === 0 || isIngesting}
        onClick={handleIngest}
        className="flex items-center justify-center gap-2 rounded-md bg-mirror-accent text-white px-4 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
      >
        {isIngesting ? (
          <>
            <Loader className="w-4 h-4 animate-spin" /> Ingesting…
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" /> Ingest {files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''}` : 'Files'}
          </>
        )}
      </button>
    </div>
  );
}
