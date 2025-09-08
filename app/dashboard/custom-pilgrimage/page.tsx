"use client";

import { useState, useEffect, Fragment, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";

interface CustomPilgrimage {
  id: number;
  title: string;
  subtitle1?: string;
  subtitle2?: string;
  subtitle3?: string;
  subtitle4?: string;
  isActive: boolean;
  heroImage?: string;
}

export default function CustomPilgrimageDashboard() {
  const [data, setData] = useState<CustomPilgrimage[]>([]);
  const [title, setTitle] = useState("");
  const [subtitle1, setSubtitle1] = useState("");
  const [subtitle2, setSubtitle2] = useState("");
  const [subtitle3, setSubtitle3] = useState("");
  const [subtitle4, setSubtitle4] = useState("");
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);

  // --- Loading States ---
  const [loading, setLoading] = useState(false); 
  const [fetching, setFetching] = useState(true); 

  // Use keys to force re-render and clear file inputs
  const [heroKey, setHeroKey] = useState(0);

  // --- Modal state ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error" | "warning">(
    "success"
  );

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // --- useRef for form scrolling ---
  const formRef = useRef<HTMLFormElement>(null);

  const showModal = (msg: string, type: "success" | "error" | "warning") => {
    setModalMessage(msg);
    setModalType(type);
    setIsModalOpen(true);
  };

  // ✅ Fetch data
  const fetchData = async () => {
    try {
      setFetching(true);
      const res = await fetch("/api/custom-pilgrimage", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch data");
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error("❌ Fetch error:", err);
      showModal("⚠️ Failed to fetch data", "error");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
      fetchData();
  }, []);

  // ✅ Reset form
  const resetForm = () => {
    setTitle("");
    setSubtitle1("");
    setSubtitle2("");
    setSubtitle3("");
    setSubtitle4("");
    setHeroFile(null);
    setIsActive(true);
    setEditingId(null);
    setHeroKey(prev => prev + 1);
  };

  // ✅ Save or Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!title.trim() || !subtitle1.trim() || !subtitle2.trim() || !subtitle3.trim() || !subtitle4.trim()) {
      setLoading(false);
      return showModal("⚠️ All fields are required", "warning");
    }
    
    // Validation for new entry
    if (!editingId && !heroFile) {
        setLoading(false);
        return showModal("⚠️ Please upload an image for a new entry", "warning");
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("subtitle1", subtitle1);
    formData.append("subtitle2", subtitle2);
    formData.append("subtitle3", subtitle3);
    formData.append("subtitle4", subtitle4);
    formData.append("isActive", String(isActive));
    
    // Add ID if editing
    if (editingId) {
      formData.append("id", String(editingId));
    }
    
    if (heroFile) {
      formData.append("heroImage", heroFile);
    }
    
    try {
      const res = await fetch("/api/custom-pilgrimage", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save");

      showModal(editingId ? "✅ Entry updated!" : "✅ Entry added!", "success");
      resetForm();
      fetchData();
    } catch (err) {
      console.error("❌ Save error:", err);
      showModal("❌ Failed to save entry", "error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Edit
  const handleEdit = (entry: CustomPilgrimage) => {
    setEditingId(entry.id);
    setTitle(entry.title);
    setSubtitle1(entry.subtitle1 || "");
    setSubtitle2(entry.subtitle2 || "");
    setSubtitle3(entry.subtitle3 || "");
    setSubtitle4(entry.subtitle4 || "");
    setIsActive(entry.isActive);
    setHeroFile(null); 

    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ✅ Delete
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/custom-pilgrimage?id=${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      showModal("🗑️ Entry deleted", "success");
      setDeleteId(null);
      fetchData();
    } catch (err) {
      console.error("❌ Delete error:", err);
      showModal("❌ Failed to delete entry", "error");
    } finally {
      setLoading(false);
      setIsDeleteOpen(false);
    }
  };

  // ✅ Toggle active/inactive
  const toggleActive = async (id: number, current: boolean) => {
    try {
      setLoading(true);
      const res = await fetch("/api/custom-pilgrimage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !current }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      showModal("✅ Status updated!", "success");
      fetchData();
    } catch (err) {
      console.error("❌ Toggle error:", err);
      showModal("⚠️ Could not update status", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">✨ Customize Your Pilgrimage</h1>

      {/* --- GLOBAL LOADER --- */}
      {(loading || fetching) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400"></div>
        </div>
      )}

      {/* --- FORM --- */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-gray-900 text-white shadow-lg rounded-2xl p-6 mb-10"
        ref={formRef}
      >
        <input
          type="text"
          placeholder="Main Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border border-gray-700 p-2 w-full rounded focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400"
          disabled={loading}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
                type="text"
                placeholder="Subtitle 1"
                value={subtitle1}
                onChange={(e) => setSubtitle1(e.target.value)}
                className="border border-gray-700 p-2 w-full rounded focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400"
                disabled={loading}
            />
            <input
                type="text"
                placeholder="Subtitle 2"
                value={subtitle2}
                onChange={(e) => setSubtitle2(e.target.value)}
                className="border border-gray-700 p-2 w-full rounded focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400"
                disabled={loading}
            />
            <input
                type="text"
                placeholder="Subtitle 3"
                value={subtitle3}
                onChange={(e) => setSubtitle3(e.target.value)}
                className="border border-gray-700 p-2 w-full rounded focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400"
                disabled={loading}
            />
            <input
                type="text"
                placeholder="Subtitle 4"
                value={subtitle4}
                onChange={(e) => setSubtitle4(e.target.value)}
                className="border border-gray-700 p-2 w-full rounded focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400"
                disabled={loading}
            />
        </div>

        <input
            type="file"
            accept="image/*"
            onChange={(e) => setHeroFile(e.target.files?.[0] || null)}
            className="border border-gray-700 p-2 w-full rounded bg-black text-white"
            key={heroKey} 
            disabled={loading}
        />

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-yellow-500 text-black px-6 py-2 rounded-lg w-full hover:bg-yellow-600 disabled:opacity-50"
          >
            {loading ? "Saving..." : editingId ? "Update " : "Save "}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
              disabled={loading}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* --- LIST --- */}
      {!fetching && data.length === 0 ? (
        <p className="text-center text-gray-500">No entries available.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((entry) => (
              <div
                key={entry.id}
                className="bg-gray-900 text-white rounded-lg shadow p-4 flex flex-col"
              >
                <h2 className="font-bold text-lg">{entry.title}</h2>
                <div className="text-gray-300 mb-2">
                    <p>{entry.subtitle1}</p>
                    <p>{entry.subtitle2}</p>
                    <p>{entry.subtitle3}</p>
                    <p>{entry.subtitle4}</p>
                </div>
                {entry.heroImage && (
                    <img
                      src={entry.heroImage}
                      alt={entry.title}
                      className="w-full h-56 object-cover rounded mt-2"
                    />
                )}
                <div className="flex justify-between gap-2 mt-4">
                  <button
                    onClick={() => handleEdit(entry)}
                    className="bg-yellow-500 text-black px-4 py-1 rounded hover:bg-yellow-600"
                    disabled={loading}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setDeleteId(entry.id);
                      setIsDeleteOpen(true);
                    }}
                    className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
                    disabled={loading}
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => toggleActive(entry.id, entry.isActive)}
                    className={`px-4 py-1 rounded ${
                      entry.isActive
                        ? "bg-green-500 hover:bg-green-600"
                        : "bg-gray-500 hover:bg-gray-600"
                    }`}
                    disabled={loading}
                  >
                    {entry.isActive ? "Active ✅" : "Inactive ❌"}
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* --- MODALS --- */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => !loading && setIsModalOpen(false)}
        >
          <div className="fixed inset-0 bg-black/50" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md rounded-2xl p-6 text-center shadow-xl bg-white text-black">
              <Dialog.Title
                className={`text-lg font-bold ${
                  modalType === "success"
                    ? "text-green-600"
                    : modalType === "error"
                    ? "text-red-600"
                    : "text-yellow-600"
                }`}
              >
                {modalType === "success"
                  ? "Success 🎉"
                  : modalType === "error"
                  ? "Error ❌"
                  : "Warning ⚠️"}
              </Dialog.Title>
              <p className="mt-2">{modalMessage}</p>
              <div className="mt-4">
                <button
                  className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300"
                  onClick={() => setIsModalOpen(false)}
                  disabled={loading}
                >
                  OK
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>

      <Transition appear show={isDeleteOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => !loading && setIsDeleteOpen(false)}
        >
          <div className="fixed inset-0 bg-black/50" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md rounded-2xl p-6 text-center shadow-xl bg-white text-black">
              <Dialog.Title className="text-lg font-bold text-red-600">
                Confirm Delete
              </Dialog.Title>
              <p className="mt-2">Are you sure you want to delete this entry?</p>
              <div className="mt-4 flex justify-center gap-4">
                <button
                  className="bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400"
                  onClick={() => setIsDeleteOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  {loading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}