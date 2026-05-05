import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const useInvoiceDelete = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const deleteInvoice = async (invoiceId: string) => {
    setIsDeleting(true);
    setDeleteMessage(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('User is not authenticated. Please log in again.');
      }
      
      const response = await fetch(`${API_URL}/api/invoices/${invoiceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error:', response.status, errorText);
        throw new Error(`Communication error with server -> (${response.status}): ${errorText}`);
      } else {
        setDeleteMessage({ type: 'success', text: 'Invoice deleted successfully!' });
        return true;
      }
    } catch (err: any) {
      console.error(err);
      setDeleteMessage({ type: 'error', text: err.message || "Unable to delete the invoice. Please try again." });
      return false;
    } finally {
      setIsDeleting(false);
    }   
  };
  return { deleteInvoice, isDeleting, deleteMessage };
};