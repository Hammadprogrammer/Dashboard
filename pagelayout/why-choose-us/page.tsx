"use client";

import { useState, useEffect, Fragment, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";
import Link from "next/link";
import {
  PencilIcon,
  TrashIcon,
  PlusCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PhotoIcon,
  LightBulbIcon, 
} from "@heroicons/react/24/outline";

interface WhyChooseUsItem {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  publicId: string;
  isActive: boolean;
}

const STATUS_MESSAGES = {
  success: { title: "Success ", iconColor: "text-green-500" },
  error: { title: "Error ", iconColor: "text-red-500" },
  warning: { title: "Warning ", iconColor: "text-yellow-500" },
} as const;


export default function WhyChooseUsDashboard() {
  const [items, setItems] = useState<WhyChooseUsItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [currentPublicId, setCurrentPublicId] = useState<string | null>(null);
  
  const [editingId, setEditingId] = useState<number | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error" | "warning">("success");

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const showModal = (msg: string, type: "success" | "error" | "warning") => {
    setModalMessage(msg);
    setModalType(type);
    setIsModalOpen(true);
  };
  
  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/why-choose-us", { cache: "no-store" }); 
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch items");
      }
      const data: WhyChooseUsItem[] = await res.json();
      setItems(data);
    } catch (err) {
      const error = err as Error;
      console.error(" Fetch Error:", error.message);
      showModal(` Could not load data. Please check the network connection.`, "error"); 
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    if (file) {
        setCurrentImageUrl(null);
    }
  }

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setImageFile(null);
    setCurrentImageUrl(null);
    setCurrentPublicId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      return showModal(" Title and description are required", "warning");
    }

    if (!editingId && !imageFile) {
        return showModal(" Image is required for new items", "warning");
    }
    if (editingId && !imageFile && !currentImageUrl) {
        return showModal(" Image is required. Please upload one or ensure the existing image is loaded.", "warning");
    }


    setIsProcessing(true);
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);

    if (editingId) {
      formData.append("id", String(editingId));
      if (imageFile) {
        formData.append("imageFile", imageFile);
        if (currentPublicId) { 
            formData.append("oldPublicId", currentPublicId);
        }
      } 
    } else {
      formData.append("imageFile", imageFile as File);
    }

    try {
      const res = await fetch("/api/why-choose-us", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      showModal(editingId ? " Item updated successfully!" : " New Item saved!", "success");
      resetForm();
      fetchItems();
    } catch (err) {
      const error = err as Error;
      console.error(" Save Error:", error.message);
      showModal(` Error saving item: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (item: WhyChooseUsItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description);
    setCurrentImageUrl(item.imageUrl);
    setCurrentPublicId(item.publicId);
    setImageFile(null); 
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
      const res = await fetch(`/api/why-choose-us?id=${deleteId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      
      showModal(" Item deleted successfully!", "success");
      setDeleteId(null);
      fetchItems();
    } catch (err) {
      const error = err as Error;
      console.error(" Delete Error:", error.message);
      showModal(` Could not delete item: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
      setIsDeleteOpen(false);
    }
  };

  const toggleActive = async (item: WhyChooseUsItem) => {
    if (isAnyActionDisabled) return; 
    
    setIsProcessing(true);
    try {
      const res = await fetch("/api/why-choose-us", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle status");
      
      showModal(" Status updated successfully!", "success");
      fetchItems();
    } catch (err) {
      const error = err as Error;
      console.error(" Toggle Error:", error.message);
      showModal(` Could not update status: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const isAnyActionDisabled = isProcessing || isLoading;
  
  const previewUrl = imageFile ? URL.createObjectURL(imageFile) : currentImageUrl;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto mt-8 md:mt-12">
      <h1
        className="text-3xl font-extrabold mb-8 text-center text-yellow-400 flex items-center justify-center"
        id="why-choose-us-heading"
      >
        <LightBulbIcon className="h-8 w-8 mr-2" /> Why Choose Us Dashboard
      </h1>

      {(isProcessing || isLoading) && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-400"></div>
            <p className="mt-4 text-white font-semibold">
              {isLoading ? "Loading Items..." : "Processing Request..."}
            </p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        ref={formRef}
        className="space-y-6 bg-gray-900 text-white shadow-2xl rounded-xl p-6 md:p-8 mb-10 border border-gray-700"
      >
        <h2 className="text-xl font-bold text-yellow-400 flex items-center">
          {editingId ? "Edit Why Choose Us Item" : "Add New Why Choose Us Item"}
          <PlusCircleIcon className="h-5 w-5 ml-2" />
        </h2>
        
        <input
          type="text"
          placeholder="Title (e.g., Best Price Guarantee)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border border-gray-700 p-3 w-full rounded-lg focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400 transition-colors"
          disabled={isProcessing}
          required
        />
        
        <textarea
          placeholder="Detailed Description (e.g., We offer a 100% money back guarantee...)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="border border-gray-700 p-3 w-full rounded-lg focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400 resize-none transition-colors"
          disabled={isProcessing}
          required
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 border border-dashed border-gray-700 rounded-lg">
          <label className="text-gray-400 flex-shrink-0 flex items-center">
            <PhotoIcon className="h-5 w-5 mr-2" /> 
            {editingId ? "Replace Icon/Image (Optional)" : "Upload Icon/Image"}
          </label>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={onFileChange}
            disabled={isProcessing}
            className="w-full md:w-auto file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-500 file:text-black hover:file:bg-yellow-600 transition-colors cursor-pointer text-sm text-gray-300"
          />
        </div>

        {previewUrl && (
          <div className="mt-4">
            <p className="text-sm text-gray-300 mb-2">Image Preview:</p>
            <img
              src={previewUrl}
              alt="Item Preview"
              className="w-full h-48 object-cover rounded-lg border border-gray-600"
              onError={(e) => {
                e.currentTarget.src = "/placeholder.png";
                e.currentTarget.onerror = null;
              }}
            />
          </div>
        )}

        <div className="flex gap-4 pt-2">
          <button
            type="submit"
            disabled={isProcessing || !title.trim() || !description.trim() || (editingId === null && !imageFile)}
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
        Current Items ({items.length})
      </h2>
      
      {!isLoading && items.length === 0 ? (
        <p className="text-center text-gray-500 p-10 bg-gray-900 rounded-xl">
          No 'Why Choose Us' items have been created yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className={`bg-gray-900 text-white rounded-xl shadow-xl p-4 flex flex-col transition-transform border ${
                item.isActive ? "border-green-600" : "border-gray-700 opacity-80"
              }`}
            >
              <div className="relative">
                <img
                  src={item.imageUrl || "/placeholder.png"}
                  alt={item.title}
                  className="w-full h-48 object-cover rounded-lg mb-3"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.png";
                    e.currentTarget.onerror = null;
                  }}
                />
                <span className={`absolute top-2 right-2 px-3 py-1 text-xs font-bold rounded-full text-black ${
                    item.isActive ? "bg-green-400" : "bg-red-400"
                }`}>
                    {item.isActive ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
              
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-extrabold text-xl text-yellow-400 line-clamp-2">
                  {item.title}
                </h3>
              </div>
              
              <p className="text-sm text-gray-300 line-clamp-3 mb-3">{item.description}</p>
              
              <div className="flex justify-between gap-2 mt-auto pt-3 border-t border-gray-700">
                <button
                  onClick={() => toggleActive(item)}
                  disabled={isAnyActionDisabled}
                  className={`px-3 py-1 rounded-full text-xs font-bold disabled:opacity-50 transition-colors flex items-center ${
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
                  {item.isActive ? "Active" : "Inactive"}
                </button>
                
                <div className="flex gap-2">
                  <Link href="#why-choose-us-heading" passHref legacyBehavior>
                    <button
                      onClick={() => handleEdit(item)}
                      disabled={isAnyActionDisabled}
                      className="bg-yellow-500 text-black px-3 py-1 rounded-lg text-sm hover:bg-yellow-600 disabled:opacity-50 flex items-center"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  </Link>
                  <button
                    onClick={() => confirmDelete(item.id)}
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
              <p className="mt-2 text-gray-300">
                Are you absolutely sure you want to delete this item? This action cannot be undone.
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