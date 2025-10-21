'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

interface FormData {
  name: string;
  fatherName: string;
  nic: string;
  category: string;
  email: string;
  phone: string;
  service: string;
  message: string;
}

export default function ContactForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    fatherName: '',
    nic: '',
    category: '',
    email: '',
    phone: '',
    service: '',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [responseMsg, setResponseMsg] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // reCAPTCHA callback
  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setResponseMsg('');

    if (!recaptchaToken) {
      setResponseMsg('Please complete the reCAPTCHA.');
      setLoading(false);
      return;
    }

    if (
      !formData.name ||
      !formData.fatherName ||
      !formData.category ||
      !formData.phone ||
      !formData.service
    ) {
      setResponseMsg(
        "Please fill in all required fields (Name, Father's Name, Category, Phone, Service)."
      );
      setLoading(false);
      return;
    }

    try {
      const payload = { ...formData, recaptchaToken };

      // API call to the serverless function
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      setResponseMsg(result.message || 'Message sent successfully!');

      if (response.ok) {
        // Clear form on success
        setFormData({
          name: '',
          fatherName: '',
          nic: '',
          category: '',
          email: '',
          phone: '',
          service: '',
          message: '',
        });
        setRecaptchaToken(null);
      }
    } catch (error) {
      console.error('Submit Error:', error);
      setResponseMsg('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Ensure this variable is set in Vercel as NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  const sitekey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY as string;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 max-w-lg mx-auto p-4 border rounded-md shadow-lg"
    >
      {/* Form Fields... (omitted for brevity) */}
      
      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          id="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
        />
      </div>

      {/* Father's Name */}
      <div>
        <label
          htmlFor="fatherName"
          className="block text-sm font-medium text-gray-700"
        >
          Father's Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="fatherName"
          id="fatherName"
          value={formData.fatherName}
          onChange={handleChange}
          required
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
        />
      </div>

      {/* NIC */}
      <div>
        <label htmlFor="nic" className="block text-sm font-medium text-gray-700">
          NIC (Optional)
        </label>
        <input
          type="text"
          name="nic"
          id="nic"
          value={formData.nic}
          onChange={handleChange}
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
        />
      </div>

      {/* Category */}
      <div>
        <label
          htmlFor="category"
          className="block text-sm font-medium text-gray-700"
        >
          Category <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="category"
          id="category"
          value={formData.category}
          onChange={handleChange}
          required
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email (Optional)
        </label>
        <input
          type="email"
          name="email"
          id="email"
          value={formData.email}
          onChange={handleChange}
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
        />
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          Phone <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="phone"
          id="phone"
          value={formData.phone}
          onChange={handleChange}
          required
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
        />
      </div>

      {/* Service */}
      <div>
        <label htmlFor="service" className="block text-sm font-medium text-gray-700">
          Service <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="service"
          id="service"
          value={formData.service}
          onChange={handleChange}
          required
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
        />
      </div>

      {/* Message */}
      <div>
        <label
          htmlFor="message"
          className="block text-sm font-medium text-gray-700"
        >
          Message (Optional)
        </label>
        <textarea
          name="message"
          id="message"
          value={formData.message}
          onChange={handleChange}
          rows={4}
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
        />
      </div>

      {/* reCAPTCHA */}
      <div className="pt-2">
        <ReCAPTCHA sitekey={sitekey} onChange={handleRecaptchaChange} />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !recaptchaToken}
        className="w-full py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit'}
      </button>

      {/* Response Message */}
      {responseMsg && (
        <p className="mt-4 text-sm text-center font-bold text-gray-800">
          {responseMsg}
        </p>
      )}
    </form>
  );
}