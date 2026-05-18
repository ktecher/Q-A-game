import { STORAGE_KEYS } from './storageKeys';

const KEY = STORAGE_KEYS.DEVICE_ID;

export function getDeviceId() {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
