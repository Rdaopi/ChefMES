import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json()); // Required to parse POST request bodies

// --- IN-MEMORY DATABASE (Simulated) ---
// We use 'let' so these values can be updated when an action is triggered

let globalStats = {
    monthlySpend: 42500,
    spendTrend: -2.4,
    targetMargin: 65.0,
    currentMargin: 64.2,
    cashRecovered: 1250.45
};

let terminalItems = [
    { 
        id: 'term-1', 
        ingredient: 'Olio Extra Vergine 5L', 
        supplier: 'Rossi Distribuzione', 
        contractPrice: 42.00, 
        livePrice: 48.50, 
        trend: '+15.4%', 
        trendDirection: 'up', 
        status: 'Warning' 
    },
    { 
        id: 'term-2', 
        ingredient: 'Farina Tipo 00 25kg', 
        supplier: 'Molino Bianco', 
        contractPrice: 18.50, 
        livePrice: 16.20, 
        trend: '-12.4%', 
        trendDirection: 'down', 
        status: 'Opportunity' 
    }
];

// --- API ENDPOINTS ---

// 1. Live Orders Endpoint
app.get('/api/orders', (req: any, res: any) => {
    res.json({
        pending: [
            { id: 'ORD-992', title: 'Fresh Produce Weekly', amount: 450.00, supplier: 'Ortofrutta Trentina', status: 'scanning' }
        ],
        approved: [
            { id: 'ORD-991', title: 'Dairy & Cheese', amount: 1200.00, supplier: 'Centrale del Latte', status: 'sent' }
        ]
    });
});

// 2. Menu Engineering Endpoint (Food Cost Analysis)
app.get('/api/menus', (req: any, res: any) => {
    res.json([
        { id: 'm1', dishName: 'Truffle Risotto', category: 'Main Course', productionCost: 9.50, sellingPrice: 28.00, profitMargin: 18.50, status: 'Star', trend: 'stable' },
        { id: 'm2', dishName: 'Wagyu Burger', category: 'Main Course', productionCost: 11.20, sellingPrice: 24.00, profitMargin: 12.80, status: 'Dog', trend: 'down' },
        { id: 'm3', dishName: 'Caprese Salad', category: 'Starters', productionCost: 3.20, sellingPrice: 14.00, profitMargin: 10.80, status: 'Plowhorse', trend: 'stable' },
        { id: 'm4', dishName: 'Lobster Ravioli', category: 'Main Course', productionCost: 14.50, sellingPrice: 32.00, profitMargin: 17.50, status: 'Puzzle', trend: 'up' }
    ]);
});

// 3. Invoice Auditor Endpoint (Clawback Detection)
app.get('/api/invoices', (req: any, res: any) => {
    res.json([
        { id: 'INV-2026/04', supplier: 'Global Carni SPA', amount: 3450.00, aiVerification: 'Salami Slicing Detected (+€45.20)', verificationStatus: 'error', actionTaken: 'Payment Blocked', actionStatus: 'blocked' },
        { id: 'INV-2026/05', supplier: 'Cantine Riunite', amount: 1200.00, aiVerification: 'Matches Contracts', verificationStatus: 'success', actionTaken: 'Cleared for Payment', actionStatus: 'cleared' }
    ]);
});

// 4. Supplier Database Endpoint (Vendor Performance)
app.get('/api/suppliers', (req: any, res: any) => {
    res.json([
        { id: 'sup-1', name: 'Bianchi Srl', category: 'Beverage & Spirits', score: 98, status: 'excellent', icon: 'fa-building', insightTitle: 'Highly Reliable', insightDescription: '0 invoice errors in the last 12 months.' },
        { id: 'sup-2', name: 'Rossi Distribuzione', category: 'Oils & Condiments', score: 42, status: 'warning', icon: 'fa-industry', insightTitle: 'Warning', insightDescription: 'Frequent unannounced price hikes.' }
    ]);
});

// 5. Trading Terminal Endpoint (Live Market Data)
app.get('/api/terminal', (req: any, res: any) => {
    res.json(terminalItems);
});

// 6. Statistics Endpoint (Dashboard Cards)
app.get('/api/stats', (req: any, res: any) => {
    res.json(globalStats);
});

// 7. Action Endpoint (Handles Terminal Buttons)
// This simulates real-time margin improvement when a user takes action
app.post('/api/actions', (req: any, res: any) => {
    const { actionType, itemId } = req.body;

    if (actionType === 'buy-dip') {
        globalStats.cashRecovered += 45.50; // Simulate immediate saving
        globalStats.currentMargin += 0.15;   // Simulate margin improvement
    } else if (actionType === 'switch-vendor') {
        globalStats.currentMargin += 0.60;   // Significant margin boost
    }

    // Mark the item as 'Stable' once action is taken to provide visual feedback
    const itemIndex = terminalItems.findIndex(i => i.id === itemId);
    if (itemIndex !== -1) {
        terminalItems[itemIndex].status = 'Stable';
    }

    res.json({ success: true, message: 'Stats updated successfully', currentStats: globalStats });
});

// --- SERVER INITIALIZATION ---
const PORT = 8000;
app.listen(PORT, () => {
    console.log(`Backend is running on port ${PORT}`);
    console.log(`Environment: Development / Demo Mode`);
});