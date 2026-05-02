const express = require('express');
const axios = require('axios');
require('dotenv').config({ path: '../.env' }); 
const { Log } = require('../logging_middleware/index.js');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3002;
const BASE_URL = process.env.BASE_URL || 'http://20.207.122.201/evaluation-service';

/**
 * MinHeap for maintaining Top K elements based on priority.
 * We want the "Top 10 highest priority", so the heap root should be the lowest priority of the 10.
 */
class MinHeap {
    constructor(compareFn) {
        this.heap = [];
        this.compare = compareFn;
    }

    push(val) {
        this.heap.push(val);
        this.bubbleUp(this.heap.length - 1);
    }

    pop() {
        if (this.heap.length === 0) return null;
        if (this.heap.length === 1) return this.heap.pop();
        const top = this.heap[0];
        this.heap[0] = this.heap.pop();
        this.bubbleDown(0);
        return top;
    }

    peek() { return this.heap[0]; }
    size() { return this.heap.length; }

    bubbleUp(idx) {
        while (idx > 0) {
            let parent = Math.floor((idx - 1) / 2);
            if (this.compare(this.heap[idx], this.heap[parent]) < 0) {
                [this.heap[idx], this.heap[parent]] = [this.heap[parent], this.heap[idx]];
                idx = parent;
            } else {
                break;
            }
        }
    }

    bubbleDown(idx) {
        const len = this.heap.length;
        while (true) {
            let left = 2 * idx + 1;
            let right = 2 * idx + 2;
            let smallest = idx;

            if (left < len && this.compare(this.heap[left], this.heap[smallest]) < 0) {
                smallest = left;
            }
            if (right < len && this.compare(this.heap[right], this.heap[smallest]) < 0) {
                smallest = right;
            }

            if (smallest !== idx) {
                [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
                idx = smallest;
            } else {
                break;
            }
        }
    }
}

function comparePriority(a, b) {
    const weights = { "Placement": 3, "Result": 2, "Event": 1 };
    const wA = weights[a.Type] || 0;
    const wB = weights[b.Type] || 0;

    if (wA !== wB) return wA - wB;

    const timeA = new Date(a.Timestamp).getTime();
    const timeB = new Date(b.Timestamp).getTime();
    return timeA - timeB;
}

app.get('/notifications/priority', async (req, res) => {
    const requestId = `req-${Date.now()}`;
    Log('backend', 'info', 'route', `[${requestId}] /notifications/priority hit`).catch(console.error);

    try {
        const token = process.env.EVAL_TOKEN;
        if (!token) throw new Error("EVAL_TOKEN missing from env");

        Log('backend', 'info', 'service', `[${requestId}] Call notifications API`).catch(console.error);
        const response = await axios.get(`${BASE_URL}/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const notifications = response.data.notifications || [];
        Log('backend', 'debug', 'service', `[${requestId}] Fetched ${notifications.length} notifs. Processing.`).catch(console.error);

        const heap = new MinHeap(comparePriority);
        for (const notif of notifications) {
            if (heap.size() < 10) {
                heap.push(notif);
            } else {

                if (comparePriority(notif, heap.peek()) > 0) {
                    heap.pop();
                    heap.push(notif);
                }
            }
        }
        const top10 = [];
        while(heap.size() > 0) {
            top10.push(heap.pop());
        }
        top10.reverse();

        Log('backend', 'info', 'controller', `[${requestId}] top10 ready`).catch(console.error);
        res.status(200).json({
            success: true,
            data: top10
        });

    } catch (error) {
        const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        Log('backend', 'error', 'handler', `[${requestId}] fetch failed`).catch(console.error);
        
        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Failed to process notifications.',
            details: errorMsg
        });
    }
});

app.listen(PORT, () => {
    console.log(`Notification Priority API running on port ${PORT}`);
});
