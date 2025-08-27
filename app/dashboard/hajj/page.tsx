"use client";

import { useState } from "react";

export default function HajjDashboardPage() {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) return alert("Please enter a package title");
    if (!price || parseFloat(price) <= 0)
      return alert("Please enter a valid price");
    if (!file) return alert("Please select an image");

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("price", price);
      formData.append("file", file);

      const res = await fetch("/api/hajj", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log("📦 Saved Package:", data);

      if (res.ok) {
        alert("✅ Hajj package saved successfully!");
        setTitle("");
        setPrice("");
        setFile(null);
        setPreview(null);
      } else {
        alert("❌ Error: " + (data.error || "Failed to save package"));
      }
    } catch (err) {
      console.error("Error uploading:", err);
      alert("⚠️ Error saving package");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Add Hajj Package
      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-white shadow-lg rounded-2xl p-6"
      >
        {/* Title */}
        <input
          type="text"
          placeholder="Package Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500"
        />

        {/* Price */}
        <input
          type="number"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500"
        />

        {/* File Upload */}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const selected = e.target.files?.[0] || null;
            setFile(selected);
            setPreview(selected ? URL.createObjectURL(selected) : null);
          }}
          className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500"
        />

        {/* Image Preview */}
        {preview && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Image Preview:</p>
            <img
              src={preview}
              alt="Preview"
              className="w-full h-48 object-cover rounded-lg border"
            />
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg w-full hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Uploading..." : "Save Package"}
        </button>
      </form>
    </div>
  );
}
