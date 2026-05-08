import { Router } from 'express';
import { globalStats, menusList, ordersData, terminalItems } from '../data/mock-db.js';
import { uploadInvoice, getInvoices, getInvoiceDetails, deleteInvoice } from '../controllers/invoiceController.js';
import { authenticate } from '../middleware/auth.js';
import { getInvoicesBySupplier, getSuppliers } from '../controllers/supplierController.js';
import { getAvailableIngredients, getMenuById, getMenus, saveDishRecipe, deleteDish } from '../controllers/menuController.js';
import { deletePreparation, getPreparationById, getPreparations, savePreparation } from '../controllers/preparationController.js';

console.log('Setting up API routes...');

const router = Router();

// --- MOCK ROUTES  ---
router.get('/stats', (req, res) => res.json(globalStats));
router.get('/terminal', (req, res) => res.json(terminalItems));
router.get('/orders', (req, res) => res.json(ordersData));

// -- REAL ROUTES ---
router.post('/invoices', authenticate, uploadInvoice);
router.get('/invoices', authenticate, getInvoices);
router.get('/invoices/:id', authenticate, getInvoiceDetails);
router.delete('/invoices/:id', authenticate, deleteInvoice);

router.get('/suppliers', authenticate, getSuppliers);
router.get('/suppliers/:id/invoices', authenticate, getInvoicesBySupplier);
router.get('/menus', authenticate, getMenus);
router.get('/menus/:id', authenticate, getMenuById);
router.get('/builder/ingredients', authenticate, getAvailableIngredients);
router.post('/menus', authenticate, saveDishRecipe);
router.delete('/menus/:id', authenticate, deleteDish); 

router.get('/preparations', authenticate, getPreparations);
router.get('/preparations/:id', authenticate, getPreparationById);
router.post('/preparations', authenticate, savePreparation);
router.put('/preparations/:id', authenticate, savePreparation);
router.delete('/preparations/:id', authenticate, deletePreparation);

export default router;