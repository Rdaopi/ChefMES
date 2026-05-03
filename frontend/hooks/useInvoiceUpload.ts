import { useState } from 'react';
import { ParsedInvoice } from '@/lib/invoiceStorage';
import { supabase } from '@/lib/supabase';

export const useInvoiceUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const uploadToBackend = async (parsedInvoice: ParsedInvoice | null, fileName: string) => {
    if (!parsedInvoice) return;

    setIsUploading(true);
    setUploadMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('User is not authenticated. Please log in again.');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...parsedInvoice, fileName }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error:', response.status, errorText);
        throw new Error(`Communication error with server -> (${response.status}): ${errorText}`);
      }

      setUploadMessage({ type: 'success', text: 'Invoice saved to database successfully!' });
    } catch (err: any) {
      console.error(err);
      setUploadMessage({ type: 'error', text: err.message || "Unable to save the invoice. Please try again." });
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadToBackend, isUploading, uploadMessage };
};