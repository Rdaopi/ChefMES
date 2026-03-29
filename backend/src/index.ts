import express from 'express';
import cors from 'cors';

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Required to parse POST request bodies

// --- IN-MEMORY DATABASE (Simulation) ---

// 1. Global Statistics (Dashboard)
let globalStats = {
    monthlySpend: 42500,
    spendTrend: -2.4,
    targetMargin: 65.0,
    currentMargin: 64.2,
    cashRecovered: 1250.45
};

// 2. Terminal Items (Live Market)
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

// 1. Statistics (Dashboard Header)
app.get('/api/stats', (req: any, res: any) => {
    res.json(globalStats);
});

// 2. Live Orders (App /orders)
app.get('/api/orders', (req: any, res: any) => {
    res.json({
        pending: [
            { id: 'ORD-992', title: 'Fresh Produce Weekly', amount: 450.00, supplier: 'Ortofrutta Trentina', status: 'scanning', date: 'Today' }
        ],
        approved: [
            { id: 'ORD-991', title: 'Dairy & Cheese', amount: 1200.00, supplier: 'Centrale del Latte', status: 'sent', date: 'Yesterday' },
            { id: 'ORD-990', title: 'Meat & Poultry Supply', amount: 3450.00, supplier: 'Global Carni SPA', status: 'delivered', date: '2 days ago' }
        ]
    });
});

// 3. Menu Engineering (App /menus)
app.get('/api/menus', (req: any, res: any) => {
    res.json([
        { id: 'm1', dishName: 'Truffle Risotto', category: 'Main Course', productionCost: 9.50, sellingPrice: 28.00, profitMargin: 18.50, status: 'Star', trend: 'stable' },
        { id: 'm2', dishName: 'Wagyu Burger', category: 'Main Course', productionCost: 11.20, sellingPrice: 24.00, profitMargin: 12.80, status: 'Dog', trend: 'down' },
        { id: 'm3', dishName: 'Caprese Salad', category: 'Starters', productionCost: 3.20, sellingPrice: 14.00, profitMargin: 10.80, status: 'Plowhorse', trend: 'stable' },
        { id: 'm4', dishName: 'Lobster Ravioli', category: 'Main Course', productionCost: 14.50, sellingPrice: 32.00, profitMargin: 17.50, status: 'Puzzle', trend: 'up' }
    ]);
});

// 4. Single Dish Drill-Down (App /menus/[id])
app.get('/api/menus/:id', (req: any, res: any) => {
    const dishId = req.params.id;

    const dishDetails: Record<string, any> = {
        'm1': {
            id: 'm1', dishName: 'Truffle Risotto', category: 'Main Course', sellingPrice: 28.00, totalCost: 9.50, profitMargin: 18.50,
            ingredients: [
                { name: 'Arborio Rice', qty: '100g', unitCost: 3.50, total: 0.35 },
                { name: 'Truffle Butter', qty: '30g', unitCost: 45.00, total: 1.35 },
                { name: 'Fresh Truffle', qty: '5g', unitCost: 800.00, total: 4.00 },
                { name: 'Parmigiano 24m', qty: '20g', unitCost: 22.00, total: 0.44 }
            ],
            estimatedCosts: [
                { type: 'Prep Time (Labor)', value: '12 mins', cost: 2.86 },
                { type: 'Cooking Energy', value: '18 mins', cost: 0.50 }
            ]
        },
        'm2': {
            id: 'm2', dishName: 'Wagyu Burger', category: 'Main Course', sellingPrice: 24.00, totalCost: 11.20, profitMargin: 12.80,
            ingredients: [
                { name: 'Wagyu Patty', qty: '200g', unitCost: 45.00, total: 9.00 },
                { name: 'Brioche Bun', qty: '1pc', unitCost: 0.80, total: 0.80 },
                { name: 'Cheddar', qty: '2 slices', unitCost: 15.00, total: 0.40 },
                { name: 'Secret Sauce', qty: '20g', unitCost: 5.00, total: 0.10 }
            ],
            estimatedCosts: [
                { type: 'Prep Time (Labor)', value: '10 mins', cost: 0.60 },
                { type: 'Grill Energy', value: '8 mins', cost: 0.30 }
            ]
        },
        'm3': {
            id: 'm3', dishName: 'Caprese Salad', category: 'Starters', sellingPrice: 14.00, totalCost: 3.20, profitMargin: 10.80,
            ingredients: [
                { name: 'Buffalo Mozzarella', qty: '150g', unitCost: 12.00, total: 1.80 },
                { name: 'Tomatoes', qty: '200g', unitCost: 4.50, total: 0.90 },
                { name: 'Fresh Basil', qty: '10g', unitCost: 15.00, total: 0.15 },
                { name: 'EVOO', qty: '15ml', unitCost: 10.00, total: 0.15 }
            ],
            estimatedCosts: [
                { type: 'Prep Time (Labor)', value: '5 mins', cost: 0.20 }
            ]
        },
        'm4': {
            id: 'm4', dishName: 'Lobster Ravioli', category: 'Main Course', sellingPrice: 32.00, totalCost: 14.50, profitMargin: 17.50,
            ingredients: [
                { name: 'Fresh Pasta Dough', qty: '120g', unitCost: 3.00, total: 0.36 },
                { name: 'Lobster Meat', qty: '80g', unitCost: 120.00, total: 9.60 },
                { name: 'Bisque Sauce', qty: '50ml', unitCost: 18.00, total: 0.90 },
                { name: 'Ricotta & Herbs', qty: '40g', unitCost: 8.00, total: 0.32 }
            ],
            estimatedCosts: [
                { type: 'Prep Time (Labor)', value: '25 mins', cost: 2.50 },
                { type: 'Boiling Energy', value: '15 mins', cost: 0.82 }
            ]
        }
    };

    const dish = dishDetails[dishId];
    if (dish) {
        res.json(dish);
    } else {
        res.status(404).json({ error: 'Dish not found' });
    }
});

// 5. Invoice Auditor (App /auditor or /invoices)
// We map both routes to the same array to prevent 404 errors
const invoicesData = [
    { id: 'INV-2026/04', supplier: 'Global Carni SPA', amount: 3450.00, aiVerification: 'Salami Slicing Detected (+€45.20)', verificationStatus: 'error', actionTaken: 'Payment Blocked', actionStatus: 'blocked' },
    { id: 'INV-2026/05', supplier: 'Cantine Riunite', amount: 1200.00, aiVerification: 'Matches Contracts', verificationStatus: 'success', actionTaken: 'Cleared for Payment', actionStatus: 'cleared' }
];
app.get('/api/invoices', (req: any, res: any) => res.json(invoicesData));
app.get('/api/auditor', (req: any, res: any) => res.json(invoicesData));

// 6. Suppliers (App /suppliers)
app.get('/api/suppliers', (req: any, res: any) => {
    res.json([
        { id: 'sup-1', name: 'Bianchi Srl', category: 'Beverage & Spirits', score: 98, status: 'excellent', icon: 'fa-building', insightTitle: 'Highly Reliable', insightDescription: '0 invoice errors in the last 12 months.' },
        { id: 'sup-2', name: 'Rossi Distribuzione', category: 'Oils & Condiments', score: 42, status: 'warning', icon: 'fa-industry', insightTitle: 'Warning', insightDescription: 'Frequent unannounced price hikes.' }
    ]);
});

// 7. Trading Terminal (App /terminal)
app.get('/api/terminal', (req: any, res: any) => {
    res.json(terminalItems);
});

// 8. Terminal Actions (Simulation logic)
app.post('/api/actions', (req: any, res: any) => {
    const { actionType, itemId } = req.body;

    if (actionType === 'buy-dip') {
        globalStats.cashRecovered += 45.50; 
        globalStats.currentMargin += 0.15;  
    } else if (actionType === 'switch-vendor') {
        globalStats.currentMargin += 0.60;  
    }

    const itemIndex = terminalItems.findIndex(i => i.id === itemId);
    if (itemIndex !== -1) {
        terminalItems[itemIndex].status = 'Stable';
    }

    res.json({ success: true, message: 'Stats updated successfully', currentStats: globalStats });
});

// --- SERVER INITIALIZATION ---
const PORT = Number(process.env.PORT) || 8000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});