const DB_NAME = "study-with-uta";
const DB_VERSION = 1;
const AUDIO_STORE = "audio-files";

export async function putAudioFile(key: string, file: Blob) {
  const db = await openAudioDb();
  await runStoreRequest(db, "readwrite", (store) => store.put(file, key));
  db.close();
}

export async function getAudioFile(key: string): Promise<Blob | null> {
  const db = await openAudioDb();
  const file = await runStoreRequest<Blob | undefined>(db, "readonly", (store) => store.get(key));
  db.close();
  return file ?? null;
}

export async function deleteAudioFile(key: string) {
  const db = await openAudioDb();
  await runStoreRequest(db, "readwrite", (store) => store.delete(key));
  db.close();
}

function openAudioDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runStoreRequest<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  createRequest: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE, mode);
    const store = transaction.objectStore(AUDIO_STORE);
    const request = createRequest(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.onerror = () => reject(transaction.error);
  });
}
