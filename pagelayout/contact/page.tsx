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

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setResponseMsg('');

    if (!recaptchaToken) {
      setResponseMsg('⚠️ Please complete the reCAPTCHA.');
      setLoading(false);
      return;
    }

    try {
      const payload = { ...formData, recaptchaToken };
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        setResponseMsg('✅ Message sent successfully!');
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
      } else {
        setResponseMsg(result.message || ' Failed to send message.');
      }
    } catch (error) {
      console.error('Submit Error:', error);
      setResponseMsg('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sitekey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY as string;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 max-w-lg mx-auto p-4 border border-gray-300 rounded-lg shadow-lg bg-white"
    >
      <h2 className="text-xl font-semibold text-center mb-4">Contact Us</h2>

      {[
        { name: 'name', label: 'Name', required: true },
        { name: 'fatherName', label: "Father's Name", required: true },
        { name: 'nic', label: 'NIC (Optional)' },
        { name: 'category', label: 'Category', required: true },
        { name: 'email', label: 'Email (Optional)', type: 'email' },
        { name: 'phone', label: 'Phone', required: true },
        { name: 'service', label: 'Service', required: true },
      ].map((field) => (
        <div key={field.name}>
          <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>
          <input
            type={field.type || 'text'}
            id={field.name}
            name={field.name}
            value={(formData as any)[field.name]}
            onChange={handleChange}
            required={field.required}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      ))}

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700">
          Message (Optional)
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          value={formData.message}
          onChange={handleChange}
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div className="pt-2">
        <ReCAPTCHA sitekey={sitekey} onChange={handleRecaptchaChange} />
      </div>

      <button
        type="submit"
        disabled={loading || !recaptchaToken}
        className={`w-full py-2 px-4 rounded-md text-sm font-medium text-white transition ${
          loading || !recaptchaToken
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-indigo-600 hover:bg-indigo-700'
        }`}
      >
        {loading ? 'Submitting...' : 'Submit'}
      </button>

      {responseMsg && (
        <p
          className={`mt-4 text-sm text-center font-semibold ${
            responseMsg.startsWith('✅')
              ? 'text-green-600'
              : responseMsg.startsWith('⚠️')
              ? 'text-yellow-600'
              : 'text-red-600'
          }`}
        >
          {responseMsg}
        </p>
      )}
    </form>
  );
}
