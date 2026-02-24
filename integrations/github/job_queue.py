import threading
import queue


class JobQueue:
    def __init__(self):
        self.jobs = queue.Queue()
        self.worker = threading.Thread(target=self._worker_loop, daemon=True)
        self.worker.start()

    def enqueue(self, job_callable, *args, **kwargs):
        self.jobs.put((job_callable, args, kwargs))

    def _worker_loop(self):
        while True:
            job_callable, args, kwargs = self.jobs.get()
            try:
                job_callable(*args, **kwargs)
            except Exception as e:
                print("Background job failed:", e)
            finally:
                self.jobs.task_done()


# global queue instance
job_queue = JobQueue()