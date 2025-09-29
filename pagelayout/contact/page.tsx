'use client';

import { useState, FormEvent } from 'react';

export default function ContactForm() {
  const [formData, setFormData] = useState({
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResponseMsg('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      setResponseMsg(result.message);

      if (response.ok) {
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
      }
    } catch (error) {
      setResponseMsg('An error occurred. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto p-4 border rounded-md shadow-lg">
      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
      </div>
      
      {/* Father's Name */}
      <div>
        <label htmlFor="fatherName" className="block text-sm font-medium text-gray-700">Father's Name</label>
        <input type="text" name="fatherName" id="fatherName" value={formData.fatherName} onChange={handleChange} required
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
      </div>
      
      {/* NIC */}
      <div>
        <label htmlFor="nic" className="block text-sm font-medium text-gray-700">NIC</label>
        <input type="text" name="nic" id="nic" value={formData.nic} onChange={handleChange} required
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
      </div>
      
      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
        <input type="text" name="category" id="category" value={formData.category} onChange={handleChange} required
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
      </div>
      
      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
        <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
      </div>
      
      {/* Phone */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
        <input type="text" name="phone" id="phone" value={formData.phone} onChange={handleChange} required
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
      </div>

      {/* Service */}
      <div>
        <label htmlFor="service" className="block text-sm font-medium text-gray-700">Service</label>
        <input type="text" name="service" id="service" value={formData.service} onChange={handleChange} required
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message</label>
        <textarea name="message" id="message" value={formData.message} onChange={handleChange} required rows={4}
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
      </div>

      {/* Submit Button */}
      <button type="submit" disabled={loading}
        className="w-full py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
        {loading ? 'Submitting...' : 'Submit'}
      </button>

      {/* Response */}
      {responseMsg && <p className="mt-4 text-sm text-center font-bold">{responseMsg}</p>}
    </form>
  );
}
