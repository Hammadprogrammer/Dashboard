// UmrahServiceDashboard.tsx
"use client";

import { useState, useEffect, Fragment, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";
import Link from "next/link";
import {
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline"; // Added necessary icons

interface ServiceImage {
  id: number;
  url: string;
  publicId: string;
}

interface UmrahService {
  id: number;
  title: string;
  description: string;
  isActive: boolean;
  heroImage?: string;
  heroImageId?: string; // Added for completeness, although not used in FE logic
  serviceImages: ServiceImage[];
}

// Status Messages Map
const STATUS_MESSAGES = {
  success: { title: "Success 🎉", iconColor: "text-green-600" },
  error: { title: "Error ❌", iconColor: "text-red-600" },
  warning: { title: "Warning ⚠️", iconColor: "text-yellow-600" },
} as const;


export default function UmrahServiceDashboard() {
  const [services, setServices] = useState<UmrahService[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageType, setImageType] = useState<"background" | "services">("background");
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [currentHeroImage, setCurrentHeroImage] = useState<string | undefined>(undefined);
  const [currentServiceImages, setCurrentServiceImages] = useState<ServiceImage[]>([]);

  // --- Loading States ---
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Use keys to force re-render and clear file inputs
  const [heroKey, setHeroKey] = useState(0);
  const [galleryKey, setGalleryKey] = useState(0);

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

  // ✅ Fetch services
  const fetchServices = async () => {
    try {
      setFetching(true);
      const res = await fetch("/api/umrah-service", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch services");
      const data: UmrahService[] = await res.json();
      setServices(data);
    } catch (err) {
      console.error("❌ Fetch error:", err);
      showModal("⚠️ Failed to fetch services", "error");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Reset form
  const resetForm = () => {
    setTitle("");
    setDescription("");
    // Preserve imageType unless reset button is clicked explicitly by user
    // For now, reset to default:
    setImageType("background"); 
    setHeroFile(null);
    setGalleryFiles([]);
    setIsActive(true);
    setEditingId(null);
    setCurrentHeroImage(undefined);
    setCurrentServiceImages([]);
    setHeroKey(prev => prev + 1);
    setGalleryKey(prev => prev + 1);
  };

  // ✅ Save or Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!title.trim() || !description.trim()) {
      setLoading(false);
      return showModal("⚠️ Title and Description are required", "warning");
    }

    const hasNewHeroFile = heroFile && heroFile.size > 0;
    const hasNewGalleryFiles = galleryFiles.length > 0 && galleryFiles.some(f => f.size > 0);

    // Validation
    if (!editingId && !hasNewHeroFile && !hasNewGalleryFiles) {
        setLoading(false);
        return showModal("⚠️ An image is required for a new service.", "warning");
    }
    if (editingId && !hasNewHeroFile && !hasNewGalleryFiles && !currentHeroImage && currentServiceImages.length === 0) {
        setLoading(false);
        return showModal("⚠️ An image is required, please upload one or ensure one exists.", "warning");
    }
    
    // Type checking for Image Switch (Crucial Validation)
    if (imageType === "background" && !isEditing && !hasNewHeroFile) {
        setLoading(false);
        return showModal("⚠️ Please upload a background image for a new background service.", "warning");
    }
    if (imageType === "services" && !isEditing && !hasNewGalleryFiles) {
        setLoading(false);
        return showModal("⚠️ Please upload at least one service image for a new gallery service.", "warning");
    }


    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("isActive", String(isActive));

    if (editingId) {
      formData.append("id", String(editingId));
    }

    // Append files based on imageType and presence of new file
    if (imageType === "background" && hasNewHeroFile) {
      formData.append("heroImage", heroFile as File);
      // NOTE: Do NOT send old serviceImages/heroImageId, backend logic handles deletion based on new file presence
    }
    
    if (imageType === "services" && hasNewGalleryFiles) {
        galleryFiles.forEach((file) => formData.append("serviceImages", file));
        // NOTE: Do NOT send old serviceImages/heroImageId
    }

    try {
      const res = await fetch("/api/umrah-service", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      showModal(editingId ? "✅ Service updated!" : "✅ Service added!", "success");
      resetForm();
      fetchServices();
    } catch (err) {
      const error = err as Error;
      console.error("❌ Save error:", error.message);
      showModal(`❌ Failed to save service: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Edit
  const handleEdit = (service: UmrahService) => {
    setEditingId(service.id);
    setTitle(service.title);
    setDescription(service.description);
    setIsActive(service.isActive);

    if (service.heroImage) {
      setImageType("background");
      setCurrentHeroImage(service.heroImage);
      setCurrentServiceImages([]); 
    } else if (service.serviceImages.length > 0) {
      setImageType("services");
      setCurrentServiceImages(service.serviceImages);
      setCurrentHeroImage(undefined); 
    } else {
      setImageType("background");
      setCurrentHeroImage(undefined);
      setCurrentServiceImages([]);
    }

    // Clear file inputs for *new* selection
    setHeroFile(null);
    setGalleryFiles([]);
    setHeroKey(prev => prev + 1); 
    setGalleryKey(prev => prev + 1); 

    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ✅ Delete (uses utility modals)
  const confirmDelete = (id: number) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };
  
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/umrah-service?id=${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      showModal("🗑️ Service deleted", "success");
      setDeleteId(null);
      fetchServices();
    } catch (err) {
      console.error("❌ Delete error:", err);
      showModal("❌ Failed to delete service", "error");
    } finally {
      setLoading(false);
      setIsDeleteOpen(false);
    }
  };

  // ✅ Toggle active/inactive
  const toggleActive = async (id: number, current: boolean) => {
    if(loading || fetching) return;
    try {
      setLoading(true);
      const res = await fetch("/api/umrah-service", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !current }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      showModal("✅ Status updated!", "success");
      fetchServices();
    } catch (err) {
      console.error("❌ Toggle error:", err);
      showModal("⚠️ Could not update status", "error");
    } finally {
      setLoading(false);
    }
  };

  const heroServices = services.filter(service => service.heroImage);
  const galleryServices = services.filter(service => service.serviceImages.length > 0);
  const isEditing = !!editingId;
  const isAnyActionDisabled = loading || fetching;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center text-yellow-400" id="umrah-service">🕋 Umrah Services Dashboard</h1>

      {/* --- GLOBAL LOADER --- */}
      {(loading || fetching) && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
             <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-400"></div>
             <p className="mt-4 text-white font-semibold">{fetching ? "Loading Services..." : "Processing Request..."}</p>
          </div>
        </div>
      )}

      {/* --- FORM --- */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-gray-900 text-white shadow-2xl rounded-2xl p-6 mb-10 border border-gray-700"
        ref={formRef}
      >
        <h2 className="text-xl font-bold text-yellow-400">{isEditing ? "Edit Umrah Service" : "Add New Umrah Service"}</h2>

        <input
          type="text"
          placeholder="Service Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border border-gray-700 p-3 w-full rounded-lg focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400 transition-colors"
          disabled={loading}
          required
        />

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="border border-gray-700 p-3 w-full rounded-lg focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400 resize-none transition-colors"
          disabled={loading}
          required
        />
        



        <select
          value={imageType}
          onChange={(e) => setImageType(e.target.value as "background" | "services")}
          className="border border-gray-700 p-3 w-full rounded-lg focus:ring-2 focus:ring-yellow-400 bg-black text-white appearance-none transition-colors"
          disabled={isEditing || loading}
        >
          <option value="background">Background/Hero Image (Replaces previous hero service on new creation)</option>
          <option value="services">Service Gallery Images</option>
        </select>

        {/* --- Image Inputs --- */}
        <div className="p-3 border border-dashed border-gray-700 rounded-lg space-y-3">
          <p className="text-sm text-gray-400 font-semibold">
              {imageType === "background" 
                ? "Upload Hero Image (JPG/PNG)"
                : "Upload Gallery Images (Select multiple)"
              }
          </p>
          
          {imageType === "background" && (
            <>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setHeroFile(e.target.files?.[0] || null)}
                className="w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-500 file:text-black hover:file:bg-yellow-600 transition-colors cursor-pointer text-sm text-gray-300"
                key={heroKey}
                disabled={loading}
              />
              {/* Preview */}
              {(heroFile || currentHeroImage) && (
                <div className="mt-4">
                  <p className="text-sm text-gray-400 mb-1">Preview:</p>
                  <img
                    src={heroFile ? URL.createObjectURL(heroFile) : currentHeroImage}
                    alt="Hero Preview"
                    className="w-full h-40 object-cover rounded-lg border border-gray-600"
                  />
                </div>
              )}
            </>
          )}

          {imageType === "services" && (
            <>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) =>
                  setGalleryFiles(e.target.files ? Array.from(e.target.files) : [])
                }
                className="w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-500 file:text-black hover:file:bg-yellow-600 transition-colors cursor-pointer text-sm text-gray-300"
                key={galleryKey}
                disabled={loading}
              />
              {/* Preview (Combines new and current images for preview) */}
              <div className="mt-4">
                <p className="text-sm text-gray-400 mb-1">Preview (New + Current):</p>
                <div className="grid grid-cols-4 gap-2">
                  {/* New files */}
                  {galleryFiles.map((file, index) => (
                    <img
                      key={index}
                      src={URL.createObjectURL(file)}
                      alt={`New Service Image ${index + 1}`}
                      className="w-full h-16 object-cover rounded-lg border border-yellow-500"
                    />
                  ))}
                  {/* Current files (only if no new files are selected) */}
                  {galleryFiles.length === 0 && currentServiceImages.map((img) => (
                    <img
                      key={img.id}
                      src={img.url}
                      alt="Current Service Image"
                      className="w-full h-16 object-cover rounded-lg border border-gray-600"
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex gap-4 pt-2">
          <button
            type="submit"
            disabled={isAnyActionDisabled || !title.trim() || !description.trim()}
            className="bg-yellow-500 text-black px-6 py-3 rounded-xl font-bold w-full hover:bg-yellow-600 disabled:opacity-50 transition-colors shadow-lg"
          >
            {loading ? "Processing..." : isEditing ? "Update Service" : "Save New Service"}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-600 disabled:opacity-50 transition-colors"
              disabled={loading}
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      {/* --- LISTS --- */}
      {!fetching && services.length === 0 ? (
        <p className="text-center text-gray-500 p-10 bg-gray-900 rounded-xl border border-gray-700">
            No Umrah services have been created yet.
        </p>
      ) : (
        <>
          {/* Background Services List */}
          {heroServices.length > 0 && (
            <div className="mb-10">
              <h1 className="text-2xl font-bold mb-4 text-gray-200 border-b border-gray-700 pb-2">Hero/Background Services</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {heroServices.map((service) => (
                  <div
                    key={service.id}
                    className="bg-gray-900 text-white rounded-xl shadow-xl p-4 flex flex-col transition-transform border border-gray-700"
                  >
                    <h2 className="font-bold text-xl text-yellow-400 line-clamp-2">{service.title}</h2>
                    <p className="text-gray-300 text-sm mb-2 line-clamp-3">{service.description}</p>
                    {service.heroImage && (
                        <img
                          src={service.heroImage}
                          alt={service.title}
                          className="w-full h-56 object-cover rounded-lg border border-gray-600 my-2"
                        />
                    )}
                    <div className="flex justify-between gap-2 mt-auto pt-3 border-t border-gray-700">
                      <Link href="#umrah-service" passHref legacyBehavior>
                      <button
                        onClick={() => handleEdit(service)}
                        className="bg-yellow-500 text-black px-4 py-1 rounded-lg hover:bg-yellow-600 disabled:opacity-50 text-sm font-semibold flex items-center"
                        disabled={isAnyActionDisabled}
                      >
                        <PencilIcon className="h-4 w-4 mr-1"/> Edit
                      </button>
                      </Link>
                      <button
                        onClick={() => confirmDelete(service.id)}
                        className="bg-red-600 text-white px-4 py-1 rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-semibold flex items-center"
                        disabled={isAnyActionDisabled}
                      >
                        <TrashIcon className="h-4 w-4 mr-1"/> Delete
                      </button>
                      <button
                        onClick={() => toggleActive(service.id, service.isActive)}
                        className={`px-4 py-1 rounded-lg disabled:opacity-50 text-sm font-semibold flex items-center ${
                          service.isActive
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-gray-600 text-white hover:bg-gray-700"
                        }`}
                        disabled={isAnyActionDisabled}
                      >
                        {service.isActive ? <CheckCircleIcon className="h-4 w-4 mr-1"/> : <XCircleIcon className="h-4 w-4 mr-1"/>}
                        {service.isActive ? "Active" : "Inactive"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gallery Services List */}
          {galleryServices.length > 0 && (
            <div>
              <h1 className="text-2xl font-bold mb-4 text-gray-200 border-b border-gray-700 pb-2">Gallery/Image Set Services</h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {galleryServices.map((service) => (
                  <div
                    key={service.id}
                    className="bg-gray-900 text-white rounded-xl shadow-xl p-4 flex flex-col transition-transform border border-gray-700"
                  >
                    <h2 className="font-bold text-xl text-yellow-400 line-clamp-2">{service.title}</h2>
                    <p className="text-gray-300 text-sm mb-2 line-clamp-3">{service.description}</p>
                    <div className="grid grid-cols-2 gap-2 my-2">
                      {service.serviceImages.slice(0, 4).map((img) => (
                        <img
                          key={img.id}
                          src={img.url}
                          alt=""
                          className="h-28 w-full object-cover rounded-lg border border-gray-600"
                        />
                      ))}
                    </div>
                    <div className="flex justify-between gap-2 mt-auto pt-3 border-t border-gray-700">
                      <Link href="#umrah-service" passHref legacyBehavior>
                      <button
                        onClick={() => handleEdit(service)}
                        className="bg-yellow-500 text-black px-4 py-1 rounded-lg hover:bg-yellow-600 disabled:opacity-50 text-sm font-semibold flex items-center"
                        disabled={isAnyActionDisabled}
                      >
                        <PencilIcon className="h-4 w-4 mr-1"/> Edit
                      </button>
                      </Link>
                      <button
                        onClick={() => confirmDelete(service.id)}
                        className="bg-red-600 text-white px-4 py-1 rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-semibold flex items-center"
                        disabled={isAnyActionDisabled}
                      >
                        <TrashIcon className="h-4 w-4 mr-1"/> Delete
                      </button>
                      <button
                        onClick={() => toggleActive(service.id, service.isActive)}
                        className={`px-4 py-1 rounded-lg disabled:opacity-50 text-sm font-semibold flex items-center ${
                          service.isActive
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-gray-600 text-white hover:bg-gray-700"
                        }`}
                        disabled={isAnyActionDisabled}
                      >
                        {service.isActive ? <CheckCircleIcon className="h-4 w-4 mr-1"/> : <XCircleIcon className="h-4 w-4 mr-1"/>}
                        {service.isActive ? "Active" : "Inactive"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
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
            <Dialog.Panel className="w-full max-w-sm rounded-xl p-6 text-center shadow-2xl bg-gray-800 text-white border border-gray-700">
              <Dialog.Title className="text-xl font-bold text-red-500">
                Confirm Deletion
              </Dialog.Title>
              <p className="mt-2 text-gray-300">
                Are you absolutely sure you want to delete this service? This action cannot be undone.
              </p>
              <div className="mt-6 flex justify-center gap-4">
                <button
                  className="bg-gray-700 px-5 py-2 rounded-lg font-semibold hover:bg-gray-600 text-white transition-colors"
                  onClick={() => setIsDeleteOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className="bg-red-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
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