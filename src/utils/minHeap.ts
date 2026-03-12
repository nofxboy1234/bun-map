type HeapNode<T> = {
  key: number;
  value: T;
};

export class MinHeap<T> {
  private data: HeapNode<T>[] = [];

  get size() {
    return this.data.length;
  }

  push(key: number, value: T) {
    this.data.push({ key, value });
    this.bubbleUp(this.data.length - 1);
  }

  pop(): HeapNode<T> | undefined {
    const first = this.data[0];
    if (!first) return undefined;

    const last = this.data.pop();

    if (this.data.length > 0 && last) {
      this.data[0] = last;
      this.bubbleDown(0);
    }

    return first;
  }

  private bubbleUp(index: number) {
    let current = index;

    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);

      if (this.data[parent]!.key <= this.data[current]!.key) break;

      [this.data[parent], this.data[current]] = [this.data[current]!, this.data[parent]!];
      current = parent;
    }
  }

  private bubbleDown(index: number) {
    let current = index;
    const length = this.data.length;

    while (true) {
      let smallest = current;
      const left = current * 2 + 1;
      const right = current * 2 + 2;

      if (left < length && this.data[left]!.key < this.data[smallest]!.key) {
        smallest = left;
      }

      if (right < length && this.data[right]!.key < this.data[smallest]!.key) {
        smallest = right;
      }

      if (smallest === current) break;

      [this.data[current], this.data[smallest]] = [this.data[smallest]!, this.data[current]!];
      current = smallest;
    }
  }
}
