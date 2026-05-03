import { Router } from 'express';
import { globalStats, menusList, ordersData, suppliersList, terminalItems } from '../data/mock-DB.js';
import { uploadInvoice, getInvoices, getInvoiceDetails } from '../controllers/invoiceController.js';
import { authenticate } from '../middleware/auth.js';

console.log('Setting up API routes...');

const router = Router();

// --- MOCK ROUTES  ---
router.get('/stats', (req, res) => res.json(globalStats));
router.get('/menus', (req, res) => res.json(menusList));
router.get('/terminal', (req, res) => res.json(terminalItems));
router.get('/orders', (req, res) => res.json(ordersData));
router.get('/suppliers', (req, res) => res.json(suppliersList));

// -- REAL ROUTES ---
router.post('/invoices', authenticate, uploadInvoice);
router.get('/invoices', authenticate, getInvoices);
router.get('/invoices/:id', authenticate, getInvoiceDetails);
export default router;