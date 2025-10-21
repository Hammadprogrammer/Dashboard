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
  StarIcon, 
  PhotoIcon,
  GlobeAsiaAustraliaIcon, 
  QueueListIcon, 
} from "@heroicons/react/24/outline";

interface SliderImage {
  id: number;
  url: string;
  publicId: string;
}

interface Tour {
  id: number;
  title: string;
  description: string;
  isActive: boolean;
  backgroundUrl?: string; // Optional background URL
  sliderImages: SliderImage[]; // Array of slider images
}

const STATUS_MESSAGES = {
  success: { title: "Success ", iconColor: "text-green-500" },
  error: { title: "Error ", iconColor: "text-red-500" },
  warning: { title: "Warning ", iconColor: "text-yellow-500" },
} as const;

export default function InternationalTourDashboard() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageType, setImageType] = useState<"background" | "slider">("background");
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [sliderFiles, setSliderFiles] = useState<File[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [isProcessing, setIsProcessing] = useState(false); 
  const [isLoading, setIsLoading] = useState(true); 
  const [backgroundKey, setBackgroundKey] = useState(0);
  const [sliderKey, setSliderKey] = useState(0);

  const formRef = useRef<HTMLFormElement | null>(null); 
  const backgroundInputRef = useRef<HTMLInputElement | null>(null);
  const sliderInputRef = useRef<HTMLInputElement | null>(null);

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

  const fetchTours = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/international-tour", { cache: "no-store" });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch tours");
      }
      const data: Tour[] = await res.json();
      setTours(data);
    } catch (err) {
      const error = err as Error;
      console.error(" Fetch Error:", error.message);
      setTours([]);
      showModal(` Error fetching tours: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
      fetchTours();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setImageType("background");
    setBackgroundFile(null);
    setSliderFiles([]);
    setIsActive(true);
    if (backgroundInputRef.current) backgroundInputRef.current.value = "";
    if (sliderInputRef.current) sliderInputRef.current.value = "";
  };

  const onBackgroundFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBackgroundFile(e.target.files?.[0] || null);
  }

  const onSliderFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderFiles(e.target.files ? Array.from(e.target.files) : []);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    if (!title.trim() || !description.trim()) {
      setIsProcessing(false);
      return showModal("Title and Description are required", "warning");
    }
    
    if (!editingId) {
        if (imageType === "background" && !backgroundFile) {
            setIsProcessing(false);
            return showModal("Please upload a background image for a new tour", "warning");
        }
        if (imageType === "slider" && sliderFiles.length === 0) {
            setIsProcessing(false);
            return showModal(" Please upload at least one slider image for a new tour", "warning");
        }
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("isActive", String(isActive));
    
    if (editingId) {
      formData.append("id", String(editingId));
    }
    
    if (imageType === "background" && backgroundFile) {
      formData.append("backgroundImage", backgroundFile);
    }
    if (imageType === "slider" && sliderFiles.length > 0) {
      sliderFiles.forEach((file) => formData.append("sliderImages", file));
    }
    
    try {
      const res = await fetch("/api/international-tour", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      let successMessage = editingId 
        ? "Tour updated successfully!" 
        : backgroundFile
          ? " New Background Tour saved!" 
          : " New Slider Tour saved!";

      showModal(successMessage, "success");
      
      resetForm();
      fetchTours();
    } catch (err) {
      const error = err as Error;
      console.error(" Save Error:", error.message);
      showModal(` Error saving tour: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (tour: Tour) => {
    setEditingId(tour.id);
    setTitle(tour.title);
    setDescription(tour.description);
    setIsActive(tour.isActive);
    
    setBackgroundFile(null); 
    setSliderFiles([]);

    if (tour.backgroundUrl) {
      setImageType("background");
    } else if (tour.sliderImages.length > 0) {
      setImageType("slider");
    } else {
      setImageType("background");
    }

    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const confirmDelete = (id: number) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/international-tour?id=${deleteId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete tour");

      showModal(" Tour deleted successfully!", "success");
      setDeleteId(null);
      fetchTours();
    } catch (err) {
      const error = err as Error;
      console.error(" Delete Error:", error.message);
      showModal(` Could not delete tour: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
      setIsDeleteOpen(false);
    }
  };

  const toggleActive = async (tour: Tour) => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/international-tour", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: tour.id, isActive: !tour.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle active");
      showModal(" Status updated successfully!", "success");
      fetchTours();
    } catch (err) {
      const error = err as Error;
      console.error(" Toggle Error:", error.message);
      showModal(` Could not update status: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };
  
  const isAnyActionDisabled = isProcessing || isLoading;

  const backgroundTours = tours.filter(tour => tour.backgroundUrl);
  const sliderTours = tours.filter(tour => tour.sliderImages.length > 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto mt-8 md:mt-12">
      <h1
        className="text-3xl font-extrabold mb-8 text-center text-yellow-400 flex items-center justify-center"
        id="international-tour-heading"
      >
        <GlobeAsiaAustraliaIcon className="h-8 w-8 mr-2" /> International Tours Dashboard
      </h1>

      {(isProcessing || isLoading) && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-400"></div>
            <p className="mt-4 text-white font-semibold">
              {isLoading ? "Loading Tours..." : "Processing Request..."}
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
          {editingId ? "Edit International Tour" : "Add New International Tour"}
          <PlusCircleIcon className="h-5 w-5 ml-2" />
        </h2>
        
        <input
          type="text"
          placeholder="Tour Title (e.g., European Grand Tour)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border border-gray-700 p-3 w-full rounded-lg focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400 transition-colors"
          disabled={isProcessing}
          required
        />
        
        <textarea
          placeholder="Detailed Description of the Tour"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="border border-gray-700 p-3 w-full rounded-lg focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400 resize-none transition-colors"
          disabled={isProcessing}
          required
        />
        
        <select
          value={imageType}
          onChange={(e) => setImageType(e.target.value as "background" | "slider")}
          disabled={editingId !== null || isProcessing} 
          className={`border border-gray-700 p-3 w-full rounded-lg focus:ring-2 focus:ring-yellow-400 bg-black text-white appearance-none transition-colors cursor-pointer ${
            editingId !== null ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          <option value="background">Background Image (Homepage Feature)</option>
          <option value="slider">Slider Images (Tour Gallery)</option>
        </select>
        {editingId !== null && (
            <p className="text-xs text-gray-400">Image Type is fixed when editing an existing tour.</p>
        )}

        {imageType === "background" ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 border border-dashed border-gray-700 rounded-lg">
                <label className="text-gray-400 flex-shrink-0 flex items-center">
                    <PhotoIcon className="h-5 w-5 mr-2" /> 
                    {editingId ? "Replace Background (Optional)" : "Upload Background Image"}
                </label>
                <input
                    type="file"
                    ref={backgroundInputRef}
                    accept="image/*"
                    onChange={onBackgroundFileChange}
                    disabled={isProcessing}
                    className="w-full md:w-auto file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-500 file:text-black hover:file:bg-yellow-600 transition-colors cursor-pointer text-sm text-gray-300"
                />
            </div>
        ) : (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 border border-dashed border-gray-700 rounded-lg">
                <label className="text-gray-400 flex-shrink-0 flex items-center">
                    <QueueListIcon className="h-5 w-5 mr-2" /> 
                    {editingId ? "Upload New Slider Images (Optional)" : "Upload Slider Images (Multiple)"}
                </label>
                <input
                    type="file"
                    ref={sliderInputRef}
                    accept="image/*"
                    multiple
                    onChange={onSliderFilesChange}
                    disabled={isProcessing}
                    className="w-full md:w-auto file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-500 file:text-black hover:file:bg-yellow-600 transition-colors cursor-pointer text-sm text-gray-300"
                />
            </div>
        )}

        <div className="flex gap-4 pt-2">
          <button
            type="submit"
            disabled={isProcessing || !title.trim() || !description.trim() || (editingId === null && ((imageType === 'background' && !backgroundFile) || (imageType === 'slider' && sliderFiles.length === 0)))}
            className="bg-yellow-500 text-black px-6 py-3 rounded-xl font-bold w-full hover:bg-yellow-600 disabled:opacity-50 transition-colors shadow-lg"
          >
            {isProcessing ? "Processing..." : editingId ? "Update Tour" : "Save New Tour"}
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


      
      {!isLoading && tours.length === 0 ? (
        <p className="text-center text-gray-500 p-10 bg-gray-900 rounded-xl">
          No international tours have been created yet.
        </p>
      ) : (
        <>
            {backgroundTours.length > 0 && (
                <div className="mb-10">
                    <h3 className="text-xl font-semibold text-yellow-400 mb-4 flex items-center">
                        <PhotoIcon className="h-5 w-5 mr-2" /> Background Tours ({backgroundTours.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {backgroundTours.map((tour) => (
                            <TourCard key={tour.id} tour={tour} isAnyActionDisabled={isAnyActionDisabled} toggleActive={toggleActive} handleEdit={handleEdit} confirmDelete={confirmDelete} />
                        ))}
                    </div>
                </div>
            )}

            {sliderTours.length > 0 && (
                <div className="mb-10">
                    <h3 className="text-xl font-semibold text-yellow-400 mb-4 flex items-center">
                        <QueueListIcon className="h-5 w-5 mr-2" /> Slider Tours ({sliderTours.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sliderTours.map((tour) => (
                            <TourCard key={tour.id} tour={tour} isAnyActionDisabled={isAnyActionDisabled} toggleActive={toggleActive} handleEdit={handleEdit} confirmDelete={confirmDelete} />
                        ))}
                    </div>
                </div>
            )}
        </>
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
                Are you absolutely sure you want to delete this tour? This action cannot be undone.
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

interface TourCardProps {
    tour: Tour;
    isAnyActionDisabled: boolean;
    toggleActive: (tour: Tour) => Promise<void>;
    handleEdit: (tour: Tour) => void;
    confirmDelete: (id: number) => void;
}

const TourCard: React.FC<TourCardProps> = ({ tour, isAnyActionDisabled, toggleActive, handleEdit, confirmDelete }) => {
    const isBackground = !!tour.backgroundUrl;
    const imageUrl = isBackground ? tour.backgroundUrl : (tour.sliderImages[0]?.url || "/placeholder.png");

    return (
        <div
            className={`bg-gray-900 text-white rounded-xl shadow-xl p-4 flex flex-col transition-transform border ${
                tour.isActive ? "border-green-600" : "border-gray-700 opacity-80"
            }`}
        >
            <div className="relative">
                <img
                    src={imageUrl}
                    alt={tour.title}
                    className="w-full h-48 object-cover rounded-lg mb-3"
                    onError={(e) => {
                        e.currentTarget.src = "/placeholder.png";
                        e.currentTarget.onerror = null;
                    }}
                />

            </div>
            
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-extrabold text-xl text-yellow-400 line-clamp-2">
                    {tour.title}
                </h3>
            </div>
            
            <p className="text-sm text-gray-300 line-clamp-3 mb-3">{tour.description}</p>
            
            <div className="flex justify-between gap-2 mt-auto pt-3 border-t border-gray-700">
                <button
                    onClick={() => toggleActive(tour)}
                    disabled={isAnyActionDisabled}
                    className={`px-3 py-1 rounded-full text-xs font-bold disabled:opacity-50 transition-colors flex items-center ${
                        tour.isActive
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-red-600 hover:bg-red-700 text-white"
                    }`}
                >
                    {tour.isActive ? (
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                    ) : (
                        <XCircleIcon className="h-4 w-4 mr-1" />
                    )}
                    {tour.isActive ? "Active" : "Inactive"}
                </button>
                
                <div className="flex gap-2">
                    <Link href="#international-tour-heading" passHref legacyBehavior>
                        <button
                            onClick={() => handleEdit(tour)}
                            disabled={isAnyActionDisabled}
                            className="bg-yellow-500 text-black px-3 py-1 rounded-lg text-sm hover:bg-yellow-600 disabled:opacity-50 flex items-center"
                        >
                            <PencilIcon className="h-4 w-4" />
                        </button>
                    </Link>
                    <button
                        onClick={() => confirmDelete(tour.id)}
                        disabled={isAnyActionDisabled}
                        className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 flex items-center"
                    >
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}