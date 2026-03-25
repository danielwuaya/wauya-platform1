import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase.js";

const C = { bg:"#08080A",s:"#111115",s2:"#18181E",b:"#222230",tx:"#F0F0F4",tm:"#9898A8",td:"#5A5A6E",acc:"#CDFF50",r:"#FF4D6A",g:"#34D399",bl:"#60A5FA",blBg:"#0A1220" };
const F = "'DM Sans', sans-serif", D = "'Sora', sans-serif";

const MIME_ICONS = {
  "application/vnd.google-apps.folder": "📁",
  "application/pdf": "📄",
  "image/": "🖼️",
  "video/": "🎬",
  "application/vnd.google-apps.spreadsheet": "📊",
  "application/vnd.google-apps.document": "📝",
  "application/vnd.google-apps.presentation": "📊",
  "application/vnd.openxmlformats": "📄",
  "text/": "📄",
};

function getIcon(mime) {
  if (!mime) return "📎";
  for (const [key, icon] of Object.entries(MIME_ICONS)) {
    if (mime.includes(key) || mime.startsWith(key)) return icon;
  }
  return "📎";
}

function getDownloadUrl(file) {
  if (file.webContentLink) return file.webContentLink;
  // Google Docs/Sheets/Slides need export
  if (file.mimeType?.includes("google-apps.spreadsheet"))
    return `https://docs.google.com/spreadsheets/d/${file.id}/export?format=xlsx`;
  if (file.mimeType?.includes("google-apps.document"))
    return `https://docs.google.com/document/d/${file.id}/export?format=pdf`;
  if (file.mimeType?.includes("google-apps.presentation"))
    return `https://docs.google.com/presentation/d/${file.id}/export?format=pptx`;
  return file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
}

function extractFolderId(url) {
  if (!url) return null;
  // Handle: https://drive.google.com/drive/folders/FOLDER_ID
  const match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  // Handle: https://drive.google.com/drive/u/0/folders/FOLDER_ID
  const match2 = url.match(/\/([a-zA-Z0-9_-]{20,})/);
  if (match2) return match2[1];
  // If it's already just an ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(url)) return url;
  return null;
}

function formatSize(bytes) {
  if (!bytes) return "";
  const b = parseInt(bytes);
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  return (b / (1024 * 1024)).toFixed(1) + " MB";
}

export default function DriveFiles({ ownerType, ownerId, currentFolderId, onUpdate, readOnly = false }) {
  const [driveUrl, setDriveUrl] = useState("");
  const [folderId, setFolderId] = useState(currentFolderId || null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [folderStack, setFolderStack] = useState([]); // for navigation
  const [linking, setLinking] = useState(false);
  const [showLink, setShowLink] = useState(!currentFolderId);

  const activeFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : folderId;

  const fetchFiles = useCallback(async (fid) => {
    if (!fid) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/drive?action=list&folderId=${fid}`);
      const data = await res.json();
      if (data.error) { setError(data.error); setFiles([]); }
      else setFiles(Array.isArray(data) ? data : []);
    } catch (e) {
      setError("Error conectando con Drive");
      setFiles([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (activeFolderId) fetchFiles(activeFolderId);
  }, [activeFolderId, fetchFiles]);

  const linkFolder = async () => {
    const id = extractFolderId(driveUrl);
    if (!id) { setError("URL de Drive no válida. Copia el link de la carpeta."); return; }
    setLinking(true);
    // Save to database
    await supabase.from(ownerType === "prospect" ? "prospects" : "clients")
      .update({ drive_folder_id: id }).eq("id", ownerId);
    setFolderId(id);
    setShowLink(false);
    setLinking(false);
    if (onUpdate) onUpdate();
  };

  const unlinkFolder = async () => {
    await supabase.from(ownerType === "prospect" ? "prospects" : "clients")
      .update({ drive_folder_id: null }).eq("id", ownerId);
    setFolderId(null);
    setFiles([]);
    setFolderStack([]);
    setShowLink(true);
    if (onUpdate) onUpdate();
  };

  const openFolder = (file) => {
    setFolderStack([...folderStack, { id: file.id, name: file.name }]);
  };

  const goBack = () => {
    setFolderStack(folderStack.slice(0, -1));
  };

  const goToRoot = () => {
    setFolderStack([]);
  };

  // ─── NO FOLDER LINKED ───
  if (!folderId || showLink) {
    if (readOnly) return null;
    return (
      <div style={{ background: C.bg, borderRadius: 12, border: `1px dashed ${C.b}`, padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🔗</div>
        <div style={{ fontFamily: D, fontSize: 14, fontWeight: 600, color: C.tx, marginBottom: 4 }}>
          Vincular carpeta de Google Drive
        </div>
        <div style={{ fontSize: 11, color: C.td, marginBottom: 16, lineHeight: 1.5 }}>
          Pega el link de la carpeta de Drive para sincronizar archivos automáticamente
        </div>
        <div style={{ display: "flex", gap: 8, maxWidth: 500, margin: "0 auto" }}>
          <input
            value={driveUrl}
            onChange={e => setDriveUrl(e.target.value)}
            placeholder="https://drive.google.com/drive/folders/..."
            style={{ flex: 1, background: C.s, border: `1px solid ${C.b}`, borderRadius: 8, padding: "9px 12px", color: C.tx, fontSize: 12, fontFamily: F, outline: "none" }}
            onKeyDown={e => e.key === "Enter" && linkFolder()}
          />
          <button
            onClick={linkFolder}
            disabled={linking || !driveUrl}
            style={{ background: C.acc, color: "#000", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 12, fontWeight: 700, fontFamily: F, cursor: "pointer", opacity: linking || !driveUrl ? 0.4 : 1 }}
          >
            {linking ? "..." : "Vincular"}
          </button>
        </div>
        {error && <div style={{ color: C.r, fontSize: 11, marginTop: 8 }}>{error}</div>}
        {currentFolderId && (
          <button onClick={() => { setShowLink(false); setFolderId(currentFolderId); }}
            style={{ background: "none", border: "none", color: C.tm, fontSize: 11, cursor: "pointer", marginTop: 12, fontFamily: F }}>
            ← Volver a archivos
          </button>
        )}
      </div>
    );
  }

  // ─── FILES VIEW ───
  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Breadcrumb */}
          <button onClick={goToRoot} style={{ background: "none", border: "none", color: folderStack.length > 0 ? C.bl : C.tx, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: F, padding: 0 }}>
            📁 Drive
          </button>
          {folderStack.map((f, i) => (
            <span key={f.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: C.td, fontSize: 11 }}>/</span>
              <button
                onClick={() => setFolderStack(folderStack.slice(0, i + 1))}
                style={{ background: "none", border: "none", color: i === folderStack.length - 1 ? C.tx : C.bl, cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: F, padding: 0 }}
              >
                {f.name}
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => fetchFiles(activeFolderId)} title="Recargar"
            style={{ background: C.s2, border: `1px solid ${C.b}`, borderRadius: 6, padding: "4px 10px", color: C.tm, cursor: "pointer", fontSize: 11, fontFamily: F }}>
            🔄 Recargar
          </button>
          {!readOnly && <button onClick={() => setShowLink(true)} title="Cambiar carpeta"
            style={{ background: C.s2, border: `1px solid ${C.b}`, borderRadius: 6, padding: "4px 10px", color: C.tm, cursor: "pointer", fontSize: 11, fontFamily: F }}>
            🔗 Cambiar
          </button>}
          {!readOnly && <button onClick={unlinkFolder} title="Desvincular"
            style={{ background: "none", border: `1px solid ${C.r}30`, borderRadius: 6, padding: "4px 10px", color: C.r, cursor: "pointer", fontSize: 11, fontFamily: F }}>
            ✕
          </button>}
        </div>
      </div>

      {/* Back button */}
      {folderStack.length > 0 && (
        <button onClick={goBack}
          style={{ display: "flex", alignItems: "center", gap: 5, background: C.s2, border: `1px solid ${C.b}`, borderRadius: 8, padding: "6px 12px", color: C.tm, cursor: "pointer", fontSize: 11, fontFamily: F, marginBottom: 10 }}>
          ← Volver
        </button>
      )}

      {/* Loading / Error */}
      {loading && <div style={{ textAlign: "center", padding: 20, color: C.tm, fontSize: 12 }}>Cargando archivos de Drive...</div>}
      {error && <div style={{ color: C.r, fontSize: 12, padding: 8 }}>{error}</div>}

      {/* File list */}
      {!loading && files.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: 32, color: C.td, fontSize: 12 }}>
          Carpeta vacía
        </div>
      )}

      {!loading && files.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {/* Folders first */}
          {files.filter(f => f.mimeType === "application/vnd.google-apps.folder").map(file => (
            <div key={file.id} onClick={() => openFolder(file)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: C.bg, borderRadius: 10, border: `1px solid ${C.b}`, cursor: "pointer", transition: "border .15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.bl + "60"}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.b}>
              <span style={{ fontSize: 20 }}>📁</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
                <div style={{ fontSize: 10, color: C.td }}>Carpeta</div>
              </div>
              <span style={{ fontSize: 11, color: C.bl }}>Abrir →</span>
            </div>
          ))}

          {/* Files */}
          {files.filter(f => f.mimeType !== "application/vnd.google-apps.folder").map(file => (
            <div key={file.id}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: C.bg, borderRadius: 10, border: `1px solid ${C.b}` }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{getIcon(file.mimeType)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
                <div style={{ fontSize: 10, color: C.td }}>
                  {formatSize(file.size)}
                  {file.modifiedTime && ` · ${new Date(file.modifiedTime).toLocaleDateString()}`}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                {file.webViewLink && (
                  <a href={file.webViewLink} target="_blank" rel="noopener noreferrer"
                    style={{ background: C.s2, border: `1px solid ${C.b}`, cursor: "pointer", color: C.tm, padding: "5px 10px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontFamily: F, fontWeight: 600, textDecoration: "none" }}>
                    👁️ Ver
                  </a>
                )}
                <a href={getDownloadUrl(file)} target="_blank" rel="noopener noreferrer"
                  style={{ background: C.blBg, border: `1px solid ${C.bl}30`, cursor: "pointer", color: C.bl, padding: "5px 10px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontFamily: F, fontWeight: 600, textDecoration: "none" }}>
                  ⬇ Descargar
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
