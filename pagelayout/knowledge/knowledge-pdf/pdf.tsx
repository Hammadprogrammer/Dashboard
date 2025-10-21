"use client";
import { useState, useEffect, Fragment, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

interface KnowledgeItem {
  id: number;
  title: string;
  description: string;
  fileUrl: string | null;
  publicId: string | null;
  isActive: boolean;
}

const STATUS_MESSAGES = {
  success: { title: "Success ", iconColor: "text-green-500" },
  error: { title: "Error ", iconColor: "text-red-500" },
  warning: { title: "Warning ", iconColor: "text-yellow-500" },
} as const;

export default function KnowledgeDashboard() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [formState, setFormState] = useState({
    title: "",
    description: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [currentPublicId, setCurrentPublicId] = useState<string | null>(null);
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
      const res = await fetch("/api/knowledge");
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch items");
      }
      const data: KnowledgeItem[] = await res.json();
      setItems(data);
    } catch (err) {
      const error = err as Error;
      console.error(" Fetch Error:", error.message);
      showModal(` Error fetching knowledge items: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const resetForm = () => {
    setFormState({ title: "", description: "" });
    setFile(null);
    setCurrentPublicId(null);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormState({
      ...formState,
      [e.target.name]: e.target.value,
    });
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { title, description } = formState;

    if (!title.trim() && !description.trim() && !file && !editingId) {
      return showModal(
        " Please provide a title, description, and a file for a new item.",
        "warning"
      );
    }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);

    if (editingId) {
      formData.append("id", String(editingId));
      if (currentPublicId) {
        formData.append("oldPublicId", currentPublicId);
      }
    }

    if (file) {
      formData.append("file", file);
    }

    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save");
      }
      showModal(editingId ? "File updated!" : " File added!", "success");
      resetForm();
      fetchItems();
    } catch (err) {
      const error = err as Error;
      console.error(" Save Error:", error.message);
      showModal(` Error saving file: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (item: KnowledgeItem) => {
    setEditingId(item.id);
    setFormState({ title: item.title, description: item.description });
    setCurrentPublicId(item.publicId);
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
      const res = await fetch(`/api/knowledge?id=${deleteId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete");
      }
      showModal(" File deleted!", "success");
      setDeleteId(null);
      fetchItems();
    } catch (err) {
      const error = err as Error;
      console.error(" Delete Error:", error.message);
      showModal(` Could not delete file: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
      setIsDeleteOpen(false);
    }
  };

  const toggleActive = async (id: number, currentStatus: boolean) => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/knowledge", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to toggle status");
      }
      showModal(" Status updated!", "success");
      fetchItems();
    } catch (err) {
      const error = err as Error;
      console.error(" Toggle Error:", error.message);
      showModal(` Could not update status: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async (url: string, title: string, id: number) => {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch file from URL: ${res.statusText}`);
      }
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);

      const safeTitle = (title.trim() || `knowledge_file_${id}`).replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      link.download = safeTitle.endsWith('.pdf') ? safeTitle : `${safeTitle}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      const error = err as Error;
      console.error(" Download failed:", error);
      showModal(` Download failed: ${error.message}`, "error");
    }
  };


  const isAnyActionDisabled = isProcessing || isLoading;
  const { title, description } = formState;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto mt-8 md:mt-12">
      <h1
        className="text-3xl font-extrabold mb-8 text-center text-yellow-400 flex items-center justify-center"
        id="knowledge-heading"
      >
        <DocumentTextIcon className="h-8 w-8 mr-2" /> Knowledge Base Management
      </h1>

    
      {(isProcessing || isLoading) && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-400"></div>
            <p className="mt-4 text-white font-semibold">
              {/* {isLoading ? "Loading Data..." : "Processing Request..."} */}
            </p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        ref={formRef}
        className="space-y-6 bg-gray-900 text-white shadow-2xl rounded-xl p-6 md:p-8 mb-10 border border-gray-700"
      >
        <h2 className="text-xl font-bold text-yellow-400">
          {editingId ? "Edit Knowledge Item" : "Add New Knowledge Item"}
        </h2>
        <input
          type="text"
          name="title"
          placeholder="Title (e.g., Q3 Financial Report)"
          value={title}
          onChange={handleChange}
          className="border border-gray-700 p-3 w-full rounded-lg focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400 transition-colors"
          disabled={isProcessing}
        />
        <textarea
          name="description"
          placeholder="Detailed description of the file's content (optional)"
          value={description}
          onChange={handleChange}
          rows={3}
          className="border border-gray-700 p-3 w-full rounded-lg focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400 resize-none transition-colors"
          disabled={isProcessing}
        />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 border border-dashed border-gray-700 rounded-lg">
          <label className="text-gray-400 flex-shrink-0">
            {editingId && currentPublicId
              ? "Replace File (PDF only)"
              : "Upload File (PDF only)"}
          </label>
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={isProcessing}
            className="w-full md:w-auto file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-500 file:text-black hover:file:bg-yellow-600 transition-colors cursor-pointer text-sm text-gray-300"
          />
        </div>

        {file && <p className="text-sm text-gray-300">📂 Selected: **{file.name}**</p>}
        {editingId && currentPublicId && !file && (
          <p className="text-sm text-yellow-300">🔗 Current file is attached. Select a new file above to replace it.</p>
        )}

        <div className="flex gap-4 pt-2">
          <button
            type="submit"
            disabled={isProcessing || (!title.trim() && !description.trim() && !file)}
            className="bg-yellow-500 text-black px-6 py-3 rounded-xl font-bold w-full hover:bg-yellow-600 disabled:opacity-50 transition-colors shadow-lg"
          >
            {isProcessing ? "Processing..." : editingId ? "Update Item" : "Save New Item"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              disabled={isProcessing}
              className="bg-gray-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <h2 className="text-2xl font-bold text-gray-200 mb-6 border-b border-gray-700 pb-2">
        Knowledge Items ({items.length})
      </h2>
      {!isLoading && items.length === 0 ? (
        <p className="text-center text-gray-500 p-10 bg-gray-900 rounded-xl">
          No knowledge items have been uploaded yet. Start by adding one above.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-gray-900 text-white rounded-xl shadow-xl p-6 flex flex-col transition-transform hover:scale-[1.02] border border-gray-800"
            >
              <div className="flex items-start justify-between mb-4">
                <DocumentTextIcon className="w-10 h-10 text-yellow-500 flex-shrink-0" />
                <button
                  onClick={() => toggleActive(item.id, item.isActive)}
                  disabled={isAnyActionDisabled}
                  className={`ml-4 px-4 py-1 rounded-full text-xs font-bold disabled:opacity-50 transition-colors flex items-center ${
                    item.isActive
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  {item.isActive ? (
                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                  ) : (
                    <XCircleIcon className="h-4 w-4 mr-1" />
                  )}
                  {item.isActive ? "ACTIVE" : "INACTIVE"}
                </button>
              </div>

              <h3 className="font-extrabold text-xl text-yellow-400 mb-2 line-clamp-2">
                {item.title || `Item ${item.id}`}
              </h3>
              <p className="text-gray-400 text-sm mb-4 line-clamp-4 flex-grow">
                {item.description || "No description provided."}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-gray-700">
                {item.fileUrl && (
                  <button
                    onClick={() => handleDownload(item.fileUrl!, item.title!, item.id)}
                    className="flex items-center justify-center bg-yellow-500 text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-yellow-600 disabled:opacity-50 transition-colors"
                    disabled={isAnyActionDisabled}
                  >
                    <ArrowDownTrayIcon className="h-5 w-5 mr-2" /> Download File
                  </button>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(item)}
                    disabled={isAnyActionDisabled}
                    className="flex-1 flex items-center justify-center bg-gray-700 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-600 disabled:opacity-50 transition-colors"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" /> Edit
                  </button>
                  <button
                    onClick={() => confirmDelete(item.id)}
                    disabled={isAnyActionDisabled}
                    className="flex-1 flex items-center justify-center bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    <TrashIcon className="h-4 w-4 mr-1" /> Delete
                  </button>
                </div>
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
            <Dialog.Panel className="w-full max-w-md rounded-xl p-6 text-center shadow-2xl bg-gray-800 text-white border border-gray-700">
              <Dialog.Title
                className={`text-2xl font-extrabold ${
                  STATUS_MESSAGES[modalType].iconColor
                }`}
              >
                {STATUS_MESSAGES[modalType].title}
              </Dialog.Title>
              <p className="mt-4 text-lg text-gray-300">{modalMessage}</p>
              <div className="mt-6">
                <button
                  className="bg-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-600 text-white transition-colors"
                  onClick={() => setIsModalOpen(false)}
                >
                  Close
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
            <Dialog.Panel className="w-full max-w-sm rounded-xl p-6 text-center shadow-2xl bg-gray-800 text-white border border-gray-700">
              <Dialog.Title className="text-xl font-bold text-red-500">
                Confirm Deletion
              </Dialog.Title>
              <p className="mt-2 text-gray-300">
                Are you absolutely sure you want to delete this knowledge item? This action cannot be undone.
              </p>
              <div className="mt-6 flex justify-center gap-4">
                <button
                  className="bg-gray-700 px-5 py-2 rounded-lg font-semibold hover:bg-gray-600 text-white transition-colors"
                  onClick={() => setIsDeleteOpen(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  className="bg-red-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                  onClick={handleDelete}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Deleting..." : "Delete Permanently"}
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}