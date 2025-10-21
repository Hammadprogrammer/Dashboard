"use client";
import { useState, useEffect, useRef, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import Link from "next/link";
import {
  PencilIcon,
  TrashIcon,
  PlusCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  StarIcon, 
  PhotoIcon,
} from "@heroicons/react/24/outline";

interface Package {
  id: number;
  title: string;
  price: number;
  imageUrl: string;
  isActive: boolean;
  category: "Economic" | "Standard" | "Premium";
}

const categories: Package["category"][] = ["Economic", "Standard", "Premium"];

const STATUS_MESSAGES = {
  success: { title: "Success ", iconColor: "text-green-500" },
  error: { title: "Error ", iconColor: "text-red-500" },
  warning: { title: "Warning ", iconColor: "text-yellow-500" },
} as const;


export default function UmrahDashboardPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [id, setId] = useState<number | null>(null); 
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<Package["category"]>("Economic");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

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
  
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*(\.\d{0,2})?$/.test(val) || val === "") setPrice(val);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(selected ? URL.createObjectURL(selected) : null);
  }

  const resetForm = () => {
    if (preview) URL.revokeObjectURL(preview); 
    setId(null);
    setTitle("");
    setPrice("");
    setCategory("Economic");
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  const handleEdit = (pkg: Package) => {
    setId(pkg.id);
    setTitle(pkg.title);
    setPrice(pkg.price.toString());
    setCategory(pkg.category);
    setPreview(pkg.imageUrl); 
    setFile(null); 
    if (fileInputRef.current) fileInputRef.current.value = "";
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  }
  
  const fetchPackages = async () => {
    try {
      setIsProcessing(true); 
      const res = await fetch("/api/umrah"); 
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch packages");
      }
      const data: Package[] = await res.json();
      setPackages(data);
    } catch (err) {
      const error = err as Error;
      console.error(" Fetch Error:", error.message);
      setPackages([]);
      showModal(` Error fetching packages: ${error.message}`, "error");
    } finally {
      setIsProcessing(false); 
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return showModal(" Enter package title", "warning");
    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0)
      return showModal(" Enter a valid price (e.g., 5000.00)", "warning");
    if (!category) return showModal(" Select category", "warning");
    if (!id && !file)
      return showModal(" Please upload an image for the new package", "warning");

    setIsProcessing(true);
    try {
      const formData = new FormData();
      if (id) formData.append("id", String(id));
      formData.append("title", title);
      formData.append("price", priceValue.toFixed(2));
      formData.append("category", category);
      if (file) formData.append("file", file);
      formData.append("isActive", "true");

      const res = await fetch("/api/umrah", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save package.");

      showModal(id ? " Package updated successfully!" : " New Package saved!", "success");
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

  const toggleActive = async (pkg: Package) => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/umrah", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pkg.id, isActive: !pkg.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle active");
      showModal(" Status updated successfully!", "success");
      fetchPackages();
    } catch (err) {
      const error = err as Error;
      console.error(" Toggle Error:", error.message);
      showModal(` Could not update status: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDelete = (pkgId: number) => {
    setDeleteId(pkgId);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/umrah?id=${deleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showModal(" Package deleted successfully!", "success");
        fetchPackages();
      } else {
        throw new Error(data.error || "Failed to delete package");
      }
    } catch (err) {
      const error = err as Error;
      console.error(" Delete Error:", error.message);
      showModal(` Could not delete package: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };
  
  const getCategoryColor = (cat: Package["category"]) => {
      if (cat === "Premium") return "bg-red-600";
      if (cat === "Standard") return "bg-blue-600";
      if (cat === "Economic") return "bg-green-600";
      return "bg-gray-500";
  }

  const isAnyActionDisabled = isProcessing || !!id;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto mt-8 md:mt-12">
      {/* Page Title */}
      <h1
        className="text-3xl font-extrabold mb-8 text-center text-yellow-400 flex items-center justify-center"
        id="umrah-heading"
      >
        <StarIcon className="h-8 w-8 mr-2" /> Umrah Packages Dashboard
      </h1>

      {isProcessing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-400"></div>
            <p className="mt-4 text-white font-semibold">Processing Request...</p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        ref={formRef}
        className="space-y-6 bg-gray-900 text-white shadow-2xl rounded-xl p-6 md:p-8 mb-10 border border-gray-700"
      >
        <h2 className="text-xl font-bold text-yellow-400 flex items-center">
          {id ? "Edit Umrah Package" : "Add New Umrah Package"}
          <PlusCircleIcon className="h-5 w-5 ml-2" />
        </h2>
        
        <input
          type="text"
          name="title"
          placeholder="Package Title "
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border border-gray-700 p-3 w-full rounded-lg focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400 transition-colors"
          disabled={isProcessing}
          required
        />
        
        <input
          type="text"
          name="price"
          placeholder="Price "
          value={price}
          onChange={handlePriceChange}
          className="border border-gray-700 p-3 w-full rounded-lg focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400 transition-colors"
          disabled={isProcessing}
          required
        />
        
        <select
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as Package["category"])}
          disabled={!!id || isProcessing}
          className={`border border-gray-700 p-3 w-full rounded-lg focus:ring-2 focus:ring-yellow-400 bg-black text-white appearance-none transition-colors cursor-pointer ${
            id ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        {!!id && <p className="text-xs text-gray-400">Category is fixed when editing an existing package.</p>}


        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 border border-dashed border-gray-700 rounded-lg">
          <label className="text-gray-400 flex-shrink-0 flex items-center">
            <PhotoIcon className="h-5 w-5 mr-2" /> 
            {id ? "Replace Image (Optional)" : "Upload Image"}
          </label>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileChange}
            disabled={isProcessing}
            className="w-full md:w-auto file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-500 file:text-black hover:file:bg-yellow-600 transition-colors cursor-pointer text-sm text-gray-300"
          />
        </div>

        {preview && (
          <div className="mt-4">
            <p className="text-sm text-gray-300 mb-2">Image Preview:</p>
            <img
              src={preview}
              alt="Package Preview"
              className="w-full h-48 object-cover rounded-lg border border-gray-600"
              onError={(e) => {
                e.currentTarget.src = "/placeholder.png";
                e.currentTarget.onerror = null;
              }}
            />
          </div>
        )}

        {/* Form Actions */}
        <div className="flex gap-4 pt-2">
          <button
            type="submit"
            disabled={isProcessing || !title.trim() || !price.trim() || (id === null && !file)}
            className="bg-yellow-500 text-black px-6 py-3 rounded-xl font-bold w-full hover:bg-yellow-600 disabled:opacity-50 transition-colors shadow-lg"
          >
            {isProcessing ? "Processing..." : id ? "Update Package" : "Save New Package"}
          </button>
          {id && (
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
        Available Packages ({packages.length})
      </h2>
      
      {!isProcessing && packages.length === 0 ? (
        <p className="text-center text-gray-500 p-10 bg-gray-900 rounded-xl">
          No Umrah packages have been created yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`bg-gray-900 text-white rounded-xl shadow-xl p-4 flex flex-col transition-transform border ${
                pkg.isActive ? "border-green-600" : "border-gray-700 opacity-80"
              }`}
            >
              <div className="relative">
                <img
                  src={pkg.imageUrl || "/placeholder.png"}
                  alt={pkg.title}
                  className="w-full h-48 object-cover rounded-lg mb-3"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.png";
                    e.currentTarget.onerror = null;
                  }}
                />
                <span className={`absolute top-2 right-2 px-3 py-1 text-xs font-bold rounded-full text-white ${getCategoryColor(pkg.category)}`}>
                    {pkg.category.toUpperCase()}
                </span>
              </div>
              
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-extrabold text-xl text-yellow-400 line-clamp-2">
                  {pkg.title}
                </h3>
              </div>
              
              <p className="text-lg font-bold text-green-400">
                {pkg.price.toFixed(2)}
              </p>
              

              <div className="flex justify-between gap-2 mt-auto pt-3 border-t border-gray-700">
                <button
                  onClick={() => toggleActive(pkg)}
                  disabled={isAnyActionDisabled}
                  className={`px-3 py-1 rounded-full text-xs font-bold disabled:opacity-50 transition-colors flex items-center ${
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
                  {pkg.isActive ? "Active" : "Inactive"}
                </button>
                
                <div className="flex gap-2">
                  <Link href="#umrah-heading" passHref legacyBehavior>
                    <button
                      onClick={() => handleEdit(pkg)}
                      disabled={isAnyActionDisabled}
                      className="bg-yellow-500 text-black px-3 py-1 rounded-lg text-sm hover:bg-yellow-600 disabled:opacity-50 flex items-center"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  </Link>
                  <button
                    onClick={() => confirmDelete(pkg.id)}
                    disabled={isAnyActionDisabled}
                    className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 flex items-center"
                  >
                    <TrashIcon className="h-4 w-4" />
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