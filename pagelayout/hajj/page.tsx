"use client";
import { useState, useEffect, useRef, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import Link from "next/link";
import {
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon, // Reusing for image download/view placeholder
  CheckCircleIcon,
  XCircleIcon,
  TicketIcon, // New icon for Hajj Packages
  PhotoIcon, // New icon for image file
} from "@heroicons/react/24/outline";

interface Package {
  id: number;
  title: string;
  price: number;
  imageUrl: string;
  publicId: string; // Added from API structure
  isActive: boolean;
  category: "Economic" | "Standard" | "Premium";
}

const categories: Package["category"][] = ["Economic", "Standard", "Premium"];

const STATUS_MESSAGES = {
  success: { title: "Success 🎉", iconColor: "text-green-500" },
  error: { title: "Error ❌", iconColor: "text-red-500" },
  warning: { title: "Warning ⚠️", iconColor: "text-yellow-500" },
} as const;

export default function HajjDashboardPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  // Form State
  const [formState, setFormState] = useState({
    title: "",
    price: "",
    category: "Economic" as Package["category"],
    isActive: true, // Default to active for new items
  });
  const [file, setFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  
  // UI State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error" | "warning">(
    "success"
  );
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const showModal = (msg: string, type: "success" | "error" | "warning") => {
    setModalMessage(msg);
    setModalType(type);
    setIsModalOpen(true);
  };

  // --- Data Fetching ---
  const fetchPackages = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/hajj"); // Assuming /api/hajj returns all packages
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch packages");
      }
      const data: Package[] = await res.json();
      setPackages(data);
    } catch (err) {
      const error = err as Error;
      console.error(" Fetch Error:", error.message);
      showModal(` Error fetching Hajj packages: ${error.message}`, "error");
      setPackages([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);
  
  // --- Form Handlers ---
  const resetForm = () => {
    setFormState({
      title: "",
      price: "",
      category: "Economic",
      isActive: true,
    });
    setFile(null);
    setEditingId(null);
    setCurrentImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormState({
      ...formState,
      [e.target.name]: e.target.value,
    });
  };

  const handleEdit = (pkg: Package) => {
    setEditingId(pkg.id);
    setFormState({
      title: pkg.title,
      price: pkg.price.toString(),
      category: pkg.category,
      isActive: pkg.isActive,
    });
    setCurrentImageUrl(pkg.imageUrl);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    // Scroll smoothly to the form for better UX
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { title, price, category, isActive } = formState;

    const numericPrice = parseFloat(price);
    if (!title.trim() || isNaN(numericPrice) || numericPrice <= 0 || !category) {
      return showModal(
        " Please provide a valid title, price (> 0), and category.",
        "warning"
      );
    }

    if (!editingId && !file) {
         return showModal(" Please upload an image file for the new package.", "warning");
    }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append("title", title);
    formData.append("price", price);
    formData.append("category", category);
    formData.append("isActive", String(isActive));

    if (editingId) {
      formData.append("id", String(editingId));
    }

    if (file) {
      formData.append("file", file);
    }

    try {
      const res = await fetch("/api/hajj", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save package");
      }
      showModal(editingId ? "Package updated! 👍" : "Package added! 🕋", "success");
      resetForm();
      fetchPackages();
    } catch (err) {
      const error = err as Error;
      console.error(" Save Error:", error.message);
      showModal(` Error saving package: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };
  
  // --- Action Handlers ---
  const confirmDelete = (id: number) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/hajj?id=${deleteId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete package");
      }
      showModal(" Package deleted! 👋", "success");
      setDeleteId(null);
      fetchPackages();
    } catch (err) {
      const error = err as Error;
      console.error(" Delete Error:", error.message);
      showModal(` Could not delete package: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
      setIsDeleteOpen(false);
    }
  };

  const toggleActive = async (id: number, currentStatus: boolean) => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/hajj", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to toggle status");
      }
      showModal(" Status updated! ✅", "success");
      fetchPackages();
    } catch (err) {
      const error = err as Error;
      console.error(" Toggle Error:", error.message);
      showModal(` Could not update status: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };
  
  const isAnyActionDisabled = isProcessing || isLoading;
  const { title, price, category, isActive } = formState;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto mt-8 md:mt-12">
      <h1
        className="text-3xl font-extrabold mb-8 text-center text-yellow-400 flex items-center justify-center"
        id="hajj-heading"
      >
        <TicketIcon className="h-8 w-8 mr-2" /> Hajj Package Management
      </h1>

      {/* --- Processing/Loading Overlay --- */}
      {(isProcessing || isLoading) && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-400"></div>
            <p className="mt-4 text-white font-semibold">
              {isLoading ? "Loading Packages..." : "Processing Request..."}
            </p>
          </div>
        </div>
      )}

      {/* --- Package Form --- */}
      <form
        onSubmit={handleSubmit}
        ref={formRef}
        className="space-y-6 bg-gray-900 text-white shadow-2xl rounded-xl p-6 md:p-8 mb-10 border border-gray-700"
      >
        <h2 className="text-xl font-bold text-yellow-400">
          {editingId ? "Edit Hajj Package" : "Add New Hajj Package"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            name="title"
            placeholder="Package Title (e.g., Premium 20-Day)"
            value={title}
            onChange={handleChange}
            className="border border-gray-700 p-3 w-full rounded-lg focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400 transition-colors"
            disabled={isProcessing}
          />
          <input
            type="number"
            name="price"
            placeholder="Price (e.g., 5000)"
            value={price}
            onChange={handleChange}
            min="1"
            step="0.01"
            className="border border-gray-700 p-3 w-full rounded-lg focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400 transition-colors"
            disabled={isProcessing}
          />
          <select
            name="category"
            value={category}
            onChange={handleChange}
            className="border border-gray-700 p-3 w-full rounded-lg focus:ring-2 focus:ring-yellow-400 bg-black text-white transition-colors"
            disabled={isProcessing}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={isActive}
              onChange={() => setFormState(s => ({ ...s, isActive: !s.isActive }))}
              className="h-5 w-5 text-yellow-500 rounded border-gray-700 focus:ring-yellow-400 bg-black"
              disabled={isProcessing}
            />
            <label htmlFor="isActive" className="text-gray-300 select-none">
              Is Active
            </label>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 border border-dashed border-gray-700 rounded-lg">
          <label className="text-gray-400 flex-shrink-0">
            {editingId && currentImageUrl
              ? "Replace Image (JPG/PNG)"
              : "Upload Image (JPG/PNG)"}
          </label>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/png"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={isProcessing}
            className="w-full md:w-auto file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-500 file:text-black hover:file:bg-yellow-600 transition-colors cursor-pointer text-sm text-gray-300"
          />
        </div>

        {file && <p className="text-sm text-gray-300">🖼️ Selected: **{file.name}**</p>}
        {editingId && currentImageUrl && !file && (
          <p className="text-sm text-yellow-300">🔗 Current image is attached. Select a new image above to replace it.</p>
        )}

        <div className="flex gap-4 pt-2">
          <button
            type="submit"
            disabled={isProcessing || !title.trim() || !price.trim() || (!editingId && !file)}
            className="bg-yellow-500 text-black px-6 py-3 rounded-xl font-bold w-full hover:bg-yellow-600 disabled:opacity-50 transition-colors shadow-lg"
          >
            {isProcessing ? "Processing..." : editingId ? "Update Package" : "Save New Package"}
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

      {/* --- Packages List --- */}
      <h2 className="text-2xl font-bold text-gray-200 mb-6 border-b border-gray-700 pb-2">
        Hajj Packages ({packages.length})
      </h2>
      {!isLoading && packages.length === 0 ? (
        <p className="text-center text-gray-500 p-10 bg-gray-900 rounded-xl">
          No Hajj packages have been created yet. Start by adding one above.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-gray-900 text-white rounded-xl shadow-xl flex flex-col transition-transform hover:scale-[1.02] border border-gray-800"
            >
              <div className="relative h-48 w-full">
                {pkg.imageUrl ? (
                    // Use a standard <img> tag for the image display
                    // Assuming imageUrl is a direct link to the image
                    <img
                        src={pkg.imageUrl}
                        alt={pkg.title}
                        className="rounded-t-xl object-cover h-full w-full"
                    />
                ) : (
                    <div className="rounded-t-xl h-full w-full bg-gray-800 flex items-center justify-center text-gray-500">
                        <PhotoIcon className="h-16 w-16" />
                    </div>
                )}
                <span className={`absolute top-3 right-3 px-3 py-1 text-xs font-bold rounded-full ${
                  pkg.category === "Premium" ? "bg-red-600" : pkg.category === "Standard" ? "bg-blue-600" : "bg-green-600"
                }`}>
                    {pkg.category.toUpperCase()}
                </span>
              </div>
              
              <div className="p-6 flex flex-col flex-grow">
                <div className="flex items-start justify-between mb-4">
                    <h3 className="font-extrabold text-xl text-yellow-400 mb-2 line-clamp-2">
                        {pkg.title || `Package ${pkg.id}`}
                    </h3>
                    <button
                        onClick={() => toggleActive(pkg.id, pkg.isActive)}
                        disabled={isAnyActionDisabled}
                        className={`ml-4 px-4 py-1 rounded-full text-xs font-bold disabled:opacity-50 transition-colors flex items-center flex-shrink-0 ${
                            pkg.isActive
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-red-600 hover:bg-red-700 text-white"
                        }`}
                    >
                        {pkg.isActive ? (
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                        ) : (
                            <XCircleIcon className="h-4 w-4 mr-1" />
                        )}
                        {pkg.isActive ? "ACTIVE" : "INACTIVE"}
                    </button>
                </div>
                
                <p className="text-2xl font-bold text-gray-200 mb-4">
                    $ {pkg.price.toFixed(2)}
                </p>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-auto pt-4 border-t border-gray-700">
                  <button
                    onClick={() => handleEdit(pkg)}
                    disabled={isAnyActionDisabled}
                    className="flex-1 flex items-center justify-center bg-gray-700 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-600 disabled:opacity-50 transition-colors"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" /> Edit
                  </button>
                  <button
                    onClick={() => confirmDelete(pkg.id)}
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

      {/* --- Global Modal (Success/Error/Warning) --- */}
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

      {/* --- Delete Confirmation Modal --- */}
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
                Are you absolutely sure you want to delete this Hajj package? This action cannot be undone.
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