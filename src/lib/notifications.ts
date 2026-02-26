import { writable } from 'svelte/store';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

const createNotificationStore = () => {
  const { subscribe, update } = writable<Notification[]>([]);

  const add = (message: string, type: NotificationType = 'info', duration = 3000) => {
    const id = crypto.randomUUID();
    update((n) => [...n, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        remove(id);
      }, duration);
    }
  };

  const remove = (id: string) => {
    update((n) => n.filter((notification) => notification.id !== id));
  };

  return {
    subscribe,
    add,
    remove,
    success: (msg: string, dur?: number) => add(msg, 'success', dur),
    error: (msg: string, dur?: number) => add(msg, 'error', dur),
    warning: (msg: string, dur?: number) => add(msg, 'warning', dur),
    info: (msg: string, dur?: number) => add(msg, 'info', dur),
  };
};

export const notifications = createNotificationStore();
