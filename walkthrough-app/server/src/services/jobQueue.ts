/**
 * Minimal in-process async queue. No Redis/BullMQ in v1 (see plan phasing) -
 * a single Docker container with low expected render volume doesn't need a
 * durable external queue yet. Jobs still in flight are lost on restart; the
 * DB reconciliation in db/sqlite.ts marks those rows failed at boot.
 */
export class JobQueue {
  private readonly pending: Array<() => Promise<void>> = [];
  private running = 0;

  constructor(private readonly concurrency: number = 1) {}

  enqueue(task: () => Promise<void>): void {
    this.pending.push(task);
    this.pump();
  }

  private pump(): void {
    while (this.running < this.concurrency && this.pending.length > 0) {
      const task = this.pending.shift();
      if (!task) break;
      this.running++;
      task()
        .catch((err) => {
          console.error('[jobQueue] Unhandled task error:', err);
        })
        .finally(() => {
          this.running--;
          this.pump();
        });
    }
  }
}

export const renderJobQueue = new JobQueue(1);
