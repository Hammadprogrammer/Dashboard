"use client";

import React, { useEffect, useState } from "react";

interface PDFType {
  id: number;
  name: string;
  filePath: string;
}

export default function PDFCrudCloud() {
  const [pdfs, setPdfs] = useState<PDFType[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch PDFs
  const fetchPdfs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/pdf", { method: "GET" });
      if (!res.ok) throw new Error("Failed to fetch PDFs");
      const data = await res.json();
      setPdfs(data);
    } catch (err) {
      console.error("Error fetching PDFs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPdfs();
  }, []);

  // Upload PDF
  const handleUpload = async () => {
    if (!file || !name) return alert("Select file and enter name!");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);

    try {
      setLoading(true);
      const res = await fetch("/api/pdf", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      setFile(null);
      setName("");
      fetchPdfs();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Delete PDF
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure?")) return;
    try {
      setLoading(true);
      const res = await fetch("/api/pdf", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Delete failed");
      fetchPdfs();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Download PDF (keep formatting)
  const handleDownload = async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = name.endsWith(".pdf") ? name : name + ".pdf";
      link.click();
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold mb-5">PDF CRUD Cloudinary</h1>

      <div className="flex mb-4">
        <input
          type="text"
          placeholder="PDF Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 mr-2"
        />
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button
          onClick={handleUpload}
          className="bg-blue-500 text-white p-2 ml-2"
          disabled={loading}
        >
          {loading ? "Uploading..." : "Upload"}
        </button>
      </div>

      <div>
        <h2 className="text-xl mb-3">Uploaded PDFs</h2>
        {loading && pdfs.length === 0 ? (
          <p>Loading PDFs...</p>
        ) : (
          <ul>
            {pdfs.map((pdf) => (
              <li key={pdf.id} className="mb-2 flex items-center gap-2">
                <span>{pdf.name}</span>
                <button
                  onClick={() => handleDownload(pdf.filePath, pdf.name)}
                  className="text-green-500"
                >
                  Download
                </button>
                <button
                  onClick={() => handleDelete(pdf.id)}
                  className="text-red-500"
                  disabled={loading}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
