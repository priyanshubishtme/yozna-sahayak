/**
 * IndexedDB Offline Storage for Yojana Sahayak (Phase 9 & Blueprint Section 12)
 *
 * Guarantees:
 * - Citizen saved schemes and document checklists persist locally in IndexedDB.
 * - 100% accessible offline without internet connectivity.
 * - Synchronizes seamlessly with localStorage fallback for universal browser support.
 */

import { SchemeItem } from '../types';

const DB_NAME = 'YojanaSahayakOfflineDB';
const DB_VERSION = 1;

export interface OfflineChecklistEntry {
  scheme_id: string;
  items: Record<string, boolean>;
  updated_at: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB not supported in this browser environment'));
      return;
    }

    const req = window.indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('saved_schemes')) {
        const store = db.createObjectStore('saved_schemes', { keyPath: 'scheme_id' });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('level', 'level', { unique: false });
      }

      if (!db.objectStoreNames.contains('checklists')) {
        db.createObjectStore('checklists', { keyPath: 'scheme_id' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Saves a scheme to IndexedDB and updates localStorage cache
 */
export async function saveSchemeOffline(scheme: SchemeItem): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('saved_schemes', 'readwrite');
    const store = tx.objectStore('saved_schemes');
    store.put({ ...scheme, saved_at: new Date().toISOString() });

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB save failed, falling back to localStorage:', err);
  }

  // LocalStorage mirror
  try {
    const raw = localStorage.getItem('yojana_saved_items');
    const list: SchemeItem[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((s) => s.scheme_id !== scheme.scheme_id);
    filtered.push(scheme);
    localStorage.setItem('yojana_saved_items', JSON.stringify(filtered));

    const idList = JSON.parse(localStorage.getItem('yojana_saved') || '[]');
    if (!idList.includes(scheme.scheme_id)) {
      idList.push(scheme.scheme_id);
      localStorage.setItem('yojana_saved', JSON.stringify(idList));
    }
  } catch {}
}

/**
 * Removes a scheme from offline store
 */
export async function removeSchemeOffline(scheme_id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('saved_schemes', 'readwrite');
    tx.objectStore('saved_schemes').delete(scheme_id);

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB remove error:', err);
  }

  try {
    const raw = localStorage.getItem('yojana_saved_items');
    if (raw) {
      const list: SchemeItem[] = JSON.parse(raw);
      localStorage.setItem('yojana_saved_items', JSON.stringify(list.filter((s) => s.scheme_id !== scheme_id)));
    }
    const idList: string[] = JSON.parse(localStorage.getItem('yojana_saved') || '[]');
    localStorage.setItem('yojana_saved', JSON.stringify(idList.filter((id) => id !== scheme_id)));
  } catch {}
}

/**
 * Retrieves all offline saved schemes
 */
export async function getSavedSchemesOffline(): Promise<SchemeItem[]> {
  try {
    const db = await openDB();
    const tx = db.transaction('saved_schemes', 'readonly');
    const store = tx.objectStore('saved_schemes');
    const req = store.getAll();

    const items = await new Promise<SchemeItem[]>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result as SchemeItem[]);
      req.onerror = () => reject(req.error);
    });

    if (items && items.length > 0) {
      return items;
    }
  } catch (err) {
    console.warn('IndexedDB read error, reading from localStorage:', err);
  }

  // LocalStorage fallback
  try {
    const raw = localStorage.getItem('yojana_saved_items');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Saves document checklist state for a scheme
 */
export async function saveChecklistOffline(scheme_id: string, items: Record<string, boolean>): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('checklists', 'readwrite');
    tx.objectStore('checklists').put({
      scheme_id,
      items,
      updated_at: new Date().toISOString()
    });

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB checklist save error:', err);
  }

  try {
    localStorage.setItem(`checklist_${scheme_id}`, JSON.stringify(items));
  } catch {}
}

/**
 * Loads document checklist state for a scheme
 */
export async function getChecklistOffline(scheme_id: string): Promise<Record<string, boolean>> {
  try {
    const db = await openDB();
    const tx = db.transaction('checklists', 'readonly');
    const store = tx.objectStore('checklists');
    const req = store.get(scheme_id);

    const record = await new Promise<OfflineChecklistEntry | undefined>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (record && record.items) {
      return record.items;
    }
  } catch (err) {
    console.warn('IndexedDB checklist read error:', err);
  }

  try {
    const raw = localStorage.getItem(`checklist_${scheme_id}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

