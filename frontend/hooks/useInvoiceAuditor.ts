// src/hooks/useInvoiceAuditor.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { InvoiceSummary, InvoiceDetailLine } from '@/lib/invoiceStorage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const useInvoiceAuditor = () => {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceSummary | null>(null);
  const [details, setDetails] = useState<InvoiceDetailLine[]>([]);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/api/invoices`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = await response.json();
      setInvoices(data || []);
    } catch (error) {
      console.error("Errore fetch invoices:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvoiceDetails = async (invoice: InvoiceSummary) => {
    setSelectedInvoice(invoice);
    setIsDetailsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/api/invoices/${invoice.id}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = await response.json();
      setDetails(data || []);
    } catch (error) {
      console.error("Errore fetch details:", error);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const closeDetails = () => setSelectedInvoice(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  return {
    invoices,
    isLoading,
    selectedInvoice,
    details,
    isDetailsLoading,
    fetchInvoiceDetails,
    closeDetails
  };
};