"use client";

import { useState, useEffect, Fragment, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";

interface Testimonial {
  id: number;
  description: string;
  image: string;
  name: string;
  title: string;
}

export default function TestimonialDashboard() {
  const [data, setData] = useState<Testimonial[]>([]);
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error" | "warning">("success");

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);

  const showModal = (msg: string, type: "success" | "error" | "warning") => {
    setModalMessage(msg);
    setModalType(type);
    setIsModalOpen(true);
  };

  const fetchData = async () => {
    try {
      setFetching(true);
      const res = await fetch("/api/testimonials", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch testimonials");
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

  const resetForm = () => {
    setDescription("");
    setName("");
    setTitle("");
    setImageFile(null);
    setEditingId(null);
    if (imageInputRef.current) {
        imageInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!description.trim() || !name.trim() || !title.trim()) {
      setLoading(false);
      return showModal("⚠️ All fields are required", "warning");
    }

    if (!editingId && !imageFile) {
        setLoading(false);
        return showModal("⚠️ Please upload an image for a new entry", "warning");
    }

    const formData = new FormData();
    formData.append("description", description);
    formData.append("name", name);
    formData.append("title", title);

    if (editingId) {
      formData.append("id", String(editingId));
    }

    if (imageFile) {
      formData.append("image", imageFile);
    }

    try {
      const res = await fetch("/api/testimonials", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save");

      showModal(editingId ? "✅ Testimonial updated!" : "✅ Testimonial added!", "success");
      resetForm();
      fetchData();
    } catch (err) {
      console.error("❌ Save error:", err);
      showModal("❌ Failed to save testimonial", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry: Testimonial) => {
    setEditingId(entry.id);
    setDescription(entry.description);
    setName(entry.name);
    setTitle(entry.title);
    setImageFile(null); // Clear file input for editing
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/testimonials?id=${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      showModal("🗑️ Testimonial deleted", "success");
      setDeleteId(null);
      fetchData();
    } catch (err) {
      console.error("❌ Delete error:", err);
      showModal("❌ Failed to delete testimonial", "error");
    } finally {
      setLoading(false);
      setIsDeleteOpen(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">What People Say</h1>

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
      >
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border border-gray-700 p-2 w-full rounded focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400"
          rows={4}
          disabled={loading}
        />
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-gray-700 p-2 w-full rounded focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400"
          disabled={loading}
        />
        <input
          type="text"
          placeholder="Title (e.g., CEO at Apple)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border border-gray-700 p-2 w-full rounded focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400"
          disabled={loading}
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          className="border border-gray-700 p-2 w-full rounded bg-black text-white"
          ref={imageInputRef}
          disabled={loading}
        />

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-yellow-500 text-black px-6 py-2 rounded-lg w-full hover:bg-yellow-600 disabled:opacity-50"
          >
            {loading ? "Saving..." : editingId ? "Update Testimonial" : "Save Testimonial"}
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
        <p className="text-center text-gray-500">No testimonials available.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((entry) => (
            <div
              key={entry.id}
              className="bg-[#24294b] text-white rounded-lg shadow-xl p-6 flex flex-col items-start gap-4"
            >
              <p className="text-gray-300 font-light mb-4 text-sm">{entry.description}</p>
              
              <div className="flex items-center w-full mt-auto">
                {entry.image && (
                  <img
                    src={entry.image}
                    alt={entry.name}
                    className="w-12 h-12 object-cover rounded-full mr-4"
                  />
                )}
                <div>
                  <h3 className="font-semibold text-white">{entry.name}</h3>
                  <p className="text-gray-400 text-sm">{entry.title}</p>
                </div>
              </div>

              <div className="flex justify-between gap-2 mt-4 w-full">
                <button
                  onClick={() => handleEdit(entry)}
                  className="bg-yellow-500 text-black px-4 py-1 rounded hover:bg-yellow-600 w-full"
                  disabled={loading}
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    setDeleteId(entry.id);
                    setIsDeleteOpen(true);
                  }}
                  className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600 w-full"
                  disabled={loading}
                >
                  Delete
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