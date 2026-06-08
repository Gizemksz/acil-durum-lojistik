// heap.js
class MinHeap {
    constructor() {
        this.heap = [];
    }

    push(item) {
        this.heap.push(item);
        this._bubbleUp(this.heap.length - 1);
    }

    pop() {
        if (this.isEmpty()) return null;
        if (this.heap.length === 1) return this.heap.pop();
        
        const min = this.heap[0];
        this.heap[0] = this.heap.pop();
        this._sinkDown(0);
        return min;
    }

    isEmpty() {
        return this.heap.length === 0;
    }

    _bubbleUp(i) {
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2);
            if (this.heap[parent].f <= this.heap[i].f) break;
            
            // Swap
            const temp = this.heap[parent];
            this.heap[parent] = this.heap[i];
            this.heap[i] = temp;
            
            i = parent;
        }
    }

    _sinkDown(i) {
        const n = this.heap.length;
        while (true) {
            let smallest = i;
            const l = 2 * i + 1;
            const r = 2 * i + 2;

            if (l < n && this.heap[l].f < this.heap[smallest].f) smallest = l;
            if (r < n && this.heap[r].f < this.heap[smallest].f) smallest = r;

            if (smallest === i) break;

            // Swap
            const temp = this.heap[smallest];
            this.heap[smallest] = this.heap[i];
            this.heap[i] = temp;

            i = smallest;
        }
    }
}
