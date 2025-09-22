"use client";

import { useState, useEffect, Fragment, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  DocumentTextIcon,
  PencilSquareIcon,
  TrashIcon,
  LinkIcon,
} from "@heroicons/react/24/solid";

interface PdfsItem {
  id: number;
  title: string;
  description: string;
  fileUrl: string;
  publicId: string;
  isPublished: boolean;
}

export default function PdfsDashboard() {
  const [items, setItems] = useState<PdfsItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [publicId, setPublicId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<
    "success" | "error" | "warning"
  >("success");

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const showModal = (
    msg: string,
    type: "success" | "error" | "warning"
  ) => {
    setModalMessage(msg);
    setModalType(type);
    setIsModalOpen(true);
  };

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/pdfs");
      if (!res.ok) throw new Error("Failed to fetch items");
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error("❌ Fetch Error:", err);
      showModal("⚠️ Error fetching items", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setFile(null);
    setFileUrl(null);
    setPublicId(null);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      return showModal("⚠️ Title and description are required", "warning");
    }
    if (!editingId && !file) {
      return showModal("⚠️ PDF file is required", "warning");
    }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);

    if (editingId) {
      formData.append("id", String(editingId));
      if (file) {
        formData.append("file", file);
        formData.append("oldPublicId", publicId as string);
      }
    } else {
      formData.append("file", file as File);
    }

    try {
      const res = await fetch("/api/pdfs", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      showModal(editingId ? "✅ PDF updated!" : "✅ PDF added!", "success");
      resetForm();
      fetchItems();
    } catch (err) {
      console.error("❌ Save Error:", err);
      showModal("⚠️ Error saving PDF", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (item: PdfsItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description);
    setFileUrl(item.fileUrl);
    setPublicId(item.publicId);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const confirmDelete = (id: number) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/pdfs?id=${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      showModal("🗑️ PDF deleted!", "success");
      setDeleteId(null);
      fetchItems();
    } catch (err) {
      console.error("❌ Delete Error:", err);
      showModal("⚠️ Could not delete PDF", "error");
    } finally {
      setIsProcessing(false);
      setIsDeleteOpen(false);
    }
  };

  const togglePublished = async (id: number, currentStatus: boolean) => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/pdfs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isPublished: !currentStatus }),
      });
      if (!res.ok) throw new Error("Failed to toggle status");
      showModal("✅ Status updated!", "success");
      fetchItems();
    } catch (err) {
      console.error("❌ Toggle Error:", err);
      showModal("⚠️ Could not update status", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const isAnyActionDisabled = isProcessing || !!editingId;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">
        📄 PDF Dashboard
      </h1>

      {isProcessing || isLoading ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400"></div>
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        ref={formRef}
        className="space-y-4 bg-gray-900 text-white shadow-lg rounded-2xl p-6 mb-10"
      >
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border border-gray-700 p-2 w-full rounded focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400"
          disabled={isProcessing}
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="border border-gray-700 p-2 w-full rounded focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400 resize-none"
          disabled={isProcessing}
        />
        <input
          type="file"
          ref={fileInputRef}
          accept=".pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={isProcessing}
          className="border border-gray-700 p-2 w-full rounded bg-black text-white"
        />
        {file && <p className="text-sm text-gray-300">📂 {file.name}</p>}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isProcessing}
            className="bg-yellow-500 text-black px-6 py-2 rounded-lg w-full hover:bg-yellow-600 disabled:opacity-50"
          >
            {isProcessing ? "Processing..." : editingId ? "Update PDF" : "Save PDF"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              disabled={isProcessing}
              className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-600 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {!isLoading && items.length === 0 ? (
        <p className="text-center text-gray-500">No PDFs uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-gray-900 text-white rounded-lg shadow p-4 flex flex-col"
            >
              <div className="w-full h-56 flex items-center justify-center mb-2 bg-gray-800 rounded-lg overflow-hidden">
                <DocumentTextIcon className="w-20 h-20 text-red-500" />
              </div>

              <h2 className="font-bold text-lg">{item.title}</h2>
              <p className="text-gray-300 mb-3 line-clamp-3">
                {item.description}
              </p>

              <div className="flex justify-between gap-2 mt-auto">
                <a
                  href={item.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white flex items-center disabled:opacity-50"
                >
                  <LinkIcon className="h-4 w-4 mr-1" /> View
                </a>
                <button
                  onClick={() => togglePublished(item.id, item.isPublished)}
                  disabled={isAnyActionDisabled}
                  className={`px-4 py-1 rounded disabled:opacity-50 ${
                    item.isPublished
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-red-500 hover:bg-red-600"
                  }`}
                >
                  {item.isPublished ? "Published ✅" : "Unpublished ❌"}
                </button>
                <button
                  onClick={() => handleEdit(item)}
                  disabled={isAnyActionDisabled}
                  className="bg-yellow-500 text-black px-4 py-1 rounded hover:bg-yellow-600 disabled:opacity-50"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => confirmDelete(item.id)}
                  disabled={isAnyActionDisabled}
                  className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600 disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setIsModalOpen(false)}
        >
          <div className="fixed inset-0 bg-black/50" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md rounded-2xl p-6 text-center shadow-xl bg-white text-black">
              <Dialog.Title
                className={`text-lg font-bold ${
                  modalType === "success" ? "text-green-600" : "text-red-600"
                }`}
              >
                {modalType === "success" ? "Success 🎉" : "Error ❌"}
              </Dialog.Title>
              <p className="mt-2">{modalMessage}</p>
              <div className="mt-4">
                <button
                  className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300"
                  onClick={() => setIsModalOpen(false)}
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
          onClose={() => !isProcessing && setIsDeleteOpen(false)}
        >
          <div className="fixed inset-0 bg-black/50" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md rounded-2xl p-6 text-center shadow-xl bg-white text-black">
              <Dialog.Title className="text-lg font-bold text-red-600">
                Confirm Delete
              </Dialog.Title>
              <p className="mt-2">
                Are you sure you want to delete this PDF?
              </p>
              <div className="mt-4 flex justify-center gap-4">
                <button
                  className="bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400"
                  onClick={() => setIsDeleteOpen(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50"
                  onClick={handleDelete}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Deleting..." : "Delete"}
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}