import { useState } from 'react';
import { ParsedInvoice } from '@/lib/invoiceStorage';
import { supabase } from '@/lib/supabase';

interface UploadMessages {
  notAuthenticated: string;
  invoiceSavedSuccess: string;
  unableToSave: string;
  communicationError: string;
}

export const useInvoiceUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const uploadToBackend = async (parsedInvoice: ParsedInvoice | null, fileName: string, messages?: UploadMessages) => {
    if (!parsedInvoice) return;

    const msg = messages ?? {
      notAuthenticated: 'User is not authenticated. Please log in again.',
      invoiceSavedSuccess: 'Invoice saved to database successfully!',
      unableToSave: 'Unable to save the invoice. Please try again.',
      communicationError: 'Communication error with server',
    };

    setIsUploading(true);
    setUploadMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error(msg.notAuthenticated);
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
        throw new Error(`${msg.communicationError} -> (${response.status}): ${errorText}`);
      }

      setUploadMessage({ type: 'success', text: msg.invoiceSavedSuccess });
    } catch (err: any) {
      console.error(err);
      setUploadMessage({ type: 'error', text: err.message || msg.unableToSave });
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadToBackend, isUploading, uploadMessage };
};
