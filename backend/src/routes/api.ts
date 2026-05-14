import { Router } from 'express';
import { globalStats, menusList, ordersData, terminalItems } from '../data/mock-db.js';
import { uploadInvoice, getInvoices, getInvoiceDetails, deleteInvoice } from '../controllers/invoiceController.js';
import { authenticate } from '../middleware/auth.js';
import { getInvoicesBySupplier, getSuppliers } from '../controllers/supplierController.js';
import { getAvailableIngredients, getMenuById, getMenus, saveDishRecipe, deleteDish } from '../controllers/menuController.js';
import { deletePreparation, getPreparationById, getPreparations, savePreparation } from '../controllers/preparationController.js';
import { getTerminalData, getIngredientSuppliers } from '../controllers/terminalController.js';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { getStats } from '../controllers/statsController.js';
import { getAlerts, applyPrice, dismissAlert } from '../controllers/alertsController.js';

console.log('Setting up API routes...');

const router = Router();

// --- MOCK ROUTES  ---
router.get('/stats', (req, res) => res.json(globalStats));
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
router.put('/menus/:id', authenticate, saveDishRecipe);
router.delete('/menus/:id', authenticate, deleteDish); 

router.get('/preparations', authenticate, getPreparations);
router.get('/preparations/:id', authenticate, getPreparationById);
router.post('/preparations', authenticate, savePreparation);
router.put('/preparations/:id', authenticate, savePreparation);
router.delete('/preparations/:id', authenticate, deletePreparation);

router.get('/terminal', authenticate, getTerminalData);
router.get('/terminal/:ingredientId/suppliers', authenticate, getIngredientSuppliers);

router.get('/stats', authenticate, getStats);
router.get('/settings', authenticate, getSettings);
router.put('/settings', authenticate, updateSettings);

router.get('/alerts', authenticate, getAlerts);
router.put('/alerts/apply-price', authenticate, applyPrice);
router.post('/alerts/dismiss', authenticate, dismissAlert);

export default router;