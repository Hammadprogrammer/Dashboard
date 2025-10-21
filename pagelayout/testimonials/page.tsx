// TestimonialDashboard.tsx

"use client";

import { useState, useEffect, Fragment, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { StarIcon, TrashIcon, PencilIcon } from "@heroicons/react/24/outline";

interface Testimonial {
  id: number;
  rating: number;
  description: string;
  image: string;
  name: string;
  title: string;
}

const STATUS_MESSAGES = {
  success: { title: "Success ", iconColor: "text-green-500" },
  error: { title: "Error ", iconColor: "text-red-500" },
  warning: { title: "Warning ", iconColor: "text-yellow-400" }, 
} as const;


export default function TestimonialDashboard() {
  const [data, setData] = useState<Testimonial[]>([]);
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [ratingInput, setRatingInput] = useState("5.0"); 
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [currentImage, setCurrentImage] = useState<string | undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error" | "warning">("success");

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const showModal = (msg: string, type: "success" | "error" | "warning") => {
// ... (Modal logic is the same)
    setModalMessage(msg);
    setModalType(type);
    setIsModalOpen(true);
  };

  const fetchData = async () => {
// ... (Fetch logic is the same)
    try {
      setFetching(true);
      const res = await fetch("/api/testimonials", { cache: "no-store" });
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.details || result.error || "Failed to fetch testimonials");
      }
      
      setData(result);
    } catch (err) {
      const error = err as Error;
      console.error(" Fetch error:", error.message);
      showModal(` Failed to fetch data: ${error.message}`, "error");
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
    setRatingInput("5.0");
    setImageFile(null);
    setEditingId(null);
    setCurrentImage(undefined);
    if (imageInputRef.current) {
        imageInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const ratingValue = parseFloat(ratingInput);

    if (!description.trim() || !name.trim() || !title.trim() || isNaN(ratingValue)) {
      setLoading(false);
      return showModal(" All fields are required and Rating must be a number.", "warning");
    }

    if (ratingValue < 1 || ratingValue > 5) {
      setLoading(false);
      return showModal(" Rating must be between 1.0 and 5.0", "warning");
    }

    const hasNewFile = imageFile && imageFile.size > 0;
    if (!editingId && !hasNewFile) {
        setLoading(false);
        return showModal(" Please upload an image for a new entry", "warning");
    }
    
    if (editingId && !hasNewFile && !currentImage) {
        setLoading(false);
        return showModal(" Please upload a new image or ensure one exists", "warning");
    }

    const formData = new FormData();
    formData.append("description", description);
    formData.append("name", name);
    formData.append("title", title);
    formData.append("rating", String(ratingValue));

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
      
      if (!res.ok) {
        throw new Error(result.details || result.error || "Failed to save testimonial");
      }

      showModal(editingId ? " Testimonial updated!" : "Testimonial added!", "success");
      resetForm();
      fetchData();
    } catch (err) {
      const error = err as Error;
      console.error(" Save error:", error.message);
      showModal(` Failed to save testimonial: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry: Testimonial) => {
    setEditingId(entry.id);
    setDescription(entry.description);
    setName(entry.name);
    setTitle(entry.title);
    setRatingInput(entry.rating.toFixed(1)); 
    setCurrentImage(entry.image);
    
    setImageFile(null);
    if (imageInputRef.current) {
        imageInputRef.current.value = "";
    }
    
    setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const confirmDelete = (id: number) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/testimonials?id=${deleteId}`, {
        method: "DELETE",
      });
      
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.details || result.error || "Failed to delete");
      }
      
      showModal(" Testimonial deleted", "success");
      setDeleteId(null);
      fetchData();
    } catch (err) {
      const error = err as Error;
      console.error(" Delete error:", error.message);
      showModal(` Failed to delete testimonial: ${error.message}`, "error");
    } finally {
      setLoading(false);
      setIsDeleteOpen(false);
    }
  };

  const isEditing = !!editingId; 
  const isAnyActionDisabled = loading || fetching;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center text-white  py-3 rounded-lg shadow-lg">
        <StarIcon className="h-8 w-8 inline-block mr-2 text-yellow-400"/> Testimonial Dashboard
      </h1>

      {(isAnyActionDisabled) && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
             <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-400"></div>
             <p className="mt-4 text-white font-semibold text-lg">{fetching ? "Loading Data..." : "Processing Request..."}</p>
          </div>
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="space-y-4 bg-gray-900 text-white shadow-lg rounded-2xl p-6 mb-10 border border-gray-700"
      >
        <h2 className="text-xl font-bold text-yellow-400 border-b border-gray-700 pb-2">
            {editingId ? "Edit Testimonial" : "Add New Testimonial"}
        </h2>
        
        <textarea
          placeholder="Testimonial Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border border-gray-700 p-3 w-full rounded-lg focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-500 resize-none"
          rows={3}
          disabled={loading}
          required
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border border-gray-700 p-3 w-full rounded-lg focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-500"
                disabled={loading}
                required
            />
            <input
                type="text"
                placeholder="Title (e.g., CEO)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border border-gray-700 p-3 w-full rounded-lg focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-500"
                disabled={loading}
                required
            />
            <input
                type="text"
                placeholder="Rating (1.0 - 5.0)"
                value={ratingInput}
                onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        setRatingInput(value);
                    }
                }}
                className="border border-gray-700 p-3 w-full rounded-lg focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-500"
                disabled={loading}
                required
            />
        </div>

        <div className="p-3 border border-gray-700 rounded-lg bg-gray-800 space-y-2">
            <p className="text-sm text-gray-400">Image File:</p>
            <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-500 file:text-black hover:file:bg-yellow-600 transition-colors cursor-pointer text-sm text-gray-300"
                ref={imageInputRef}
                disabled={loading}
            />
            {isEditing && currentImage && (
                <div className="mt-3 flex items-center p-2 bg-gray-900 rounded-lg">
                    <p className="text-xs text-gray-500 mr-4 flex-shrink-0">Current Image:</p>
                    <img
                        src={currentImage}
                        alt="Current Testimonial Image"
                        className="w-10 h-10 object-cover rounded-full border border-yellow-400"
                    />
                </div>
            )}
        </div>


        <div className="flex gap-4 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-yellow-500 text-black px-6 py-3 rounded-lg font-bold w-full hover:bg-yellow-600 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
          >
            <PencilIcon className="h-5 w-5"/>
            <span>{loading ? "Saving..." : editingId ? "Update Testimonial" : "Save Testimonial"}</span>
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-700 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-600 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
          )}
        </div>
      </form>



      {fetching && data.length === 0 ? (
          <p className="text-center text-gray-400 p-10 bg-gray-900 rounded-xl border border-gray-700">Fetching testimonials...</p>
      ) : data.length === 0 ? (
        <p className="text-center text-gray-400 p-10 bg-gray-900 rounded-xl border border-gray-700">No testimonials available.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((entry) => (
            <div
              key={entry.id}
              className="bg-gray-900 text-white rounded-xl shadow-xl p-6 flex flex-col items-start gap-4 border border-gray-700 transition-colors"
            >
              <div className="flex justify-between w-full items-start">
                <p className="text-gray-300 font-light italic text-base flex-grow pr-2">"{entry.description}"</p>
                <span className="text-yellow-400 font-extrabold text-xl flex-shrink-0 flex items-center">
                    {entry.rating.toFixed(1)} <StarIcon className="h-5 w-5 ml-1"/>
                </span>
              </div>
               
              <div className="flex items-center w-full mt-auto pt-3 border-t border-gray-800">
                {entry.image && (
                  <img
                    src={entry.image}
                    alt={entry.name}
                    className="w-12 h-12 object-cover rounded-full mr-4 border-2 border-yellow-400"
                    onError={(e) => { e.currentTarget.src = "/placeholder.png"; e.currentTarget.onerror = null; }}
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
                  className="bg-yellow-500 text-black px-4 py-2 rounded-lg hover:bg-yellow-600 w-full font-semibold disabled:opacity-50 transition-colors flex items-center justify-center space-x-1"
                  disabled={isAnyActionDisabled}
                >
                  <PencilIcon className="h-4 w-4"/> Edit
                </button>
                <button
                  onClick={() => confirmDelete(entry.id)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 w-full font-semibold disabled:opacity-50 transition-colors flex items-center justify-center space-x-1"
                  disabled={isAnyActionDisabled}
                >
                  <TrashIcon className="h-4 w-4"/> Delete
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
          onClose={() => !loading && setIsModalOpen(false)}
        >
          <div className="fixed inset-0 bg-black/50" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md rounded-2xl p-6 text-center shadow-xl bg-gray-800 text-white">
              <Dialog.Title
                className={`text-lg font-bold ${STATUS_MESSAGES[modalType].iconColor}`}
              >
                {STATUS_MESSAGES[modalType].title}
              </Dialog.Title>
              <p className="mt-2 text-gray-300">{modalMessage}</p>
              <div className="mt-4">
                <button
                  className="bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-600 text-white"
                  onClick={() => setIsModalOpen(false)}
                  disabled={loading}
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
          onClose={() => !loading && setIsDeleteOpen(false)}
        >
          <div className="fixed inset-0 bg-black/50" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md rounded-2xl p-6 text-center shadow-xl bg-gray-800 text-white">
              <Dialog.Title className="text-lg font-bold text-red-600">
                Confirm Delete
              </Dialog.Title>
              <p className="mt-2 text-gray-300">Are you sure you want to delete this entry?</p>
              <div className="mt-4 flex justify-center gap-4">
                <button
                  className="bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-600 text-white"
                  onClick={() => setIsDeleteOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  {loading ? "Deleting..." : "Delete Permanently"}
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}