const express = require('express');
const axios = require('axios');
require('dotenv').config({ path: '../.env' }); 
const { Log } = require('../logging_middleware/index.js');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.BASE_URL || 'http://20.207.122.201/evaluation-service';

async function fetchWithAuth(endpoint) {
    const token = process.env.EVAL_TOKEN;
    if (!token) throw new Error('EVAL_TOKEN not found in environment');

    const response = await axios.get(`${BASE_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
}

/**
 * Space-Optimized 0/1 Knapsack
 * Time Complexity: O(n * capacity)
 * Space Complexity: O(capacity) for the DP array
 */
function optimizeDepotSchedule(budget, vehicles) {
    let dp = Array.from({ length: budget + 1 }, () => ({
        impact: 0,
        duration: 0,
        tasks: []
    }));

    for (let i = 0; i < vehicles.length; i++) {
        const task = vehicles[i];
        const w = task.Duration;
        const v = task.Impact;

        for (let j = budget; j >= w; j--) {
            if (dp[j - w].impact + v > dp[j].impact) {
                dp[j] = {
                    impact: dp[j - w].impact + v,
                    duration: dp[j - w].duration + w,
                    tasks: [...dp[j - w].tasks, task.TaskID]
                };
            }
        }
    }

    return dp[budget];
}

app.post('/schedule', async (req, res) => {
    const requestId = `req-${Date.now()}`;
    Log('backend', 'info', 'route', `[${requestId}] /schedule hit`).catch(console.error);

    try {
        Log('backend', 'info', 'service', `[${requestId}] fetch depots & vehicles`).catch(console.error);
        const [depotsData, vehiclesData] = await Promise.all([
            fetchWithAuth('/depots'),
            fetchWithAuth('/vehicles')
        ]);

        const depots = depotsData.depots;
        const vehicles = vehiclesData.vehicles;

        Log('backend', 'info', 'service', `[${requestId}] fetched ${depots.length} D, ${vehicles.length} V`).catch(console.error);

        const results = [];

        for (const depot of depots) {
            Log('backend', 'debug', 'service', `[${requestId}] knapsack depot ${depot.ID}`).catch(console.error);
            
            const schedule = optimizeDepotSchedule(depot.MechanicHours, vehicles);
            
            results.push({
                depotId: depot.ID,
                mechanicHoursBudget: depot.MechanicHours,
                selectedTasks: schedule.tasks,
                totalImpact: schedule.impact,
                totalDuration: schedule.duration
            });
        }

        Log('backend', 'info', 'controller', `[${requestId}] schedule done`).catch(console.error);
        
        res.status(200).json({
            success: true,
            data: results
        });

    } catch (error) {
        const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        Log('backend', 'error', 'handler', `[${requestId}] schedule failed`).catch(console.error);
        
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Failed to generate schedule. Ensure tokens are valid.',
            details: errorMsg
        });
    }
});

app.listen(PORT, () => {
    console.log(`Vehicle Maintenance Scheduler running on port ${PORT}`);
});
