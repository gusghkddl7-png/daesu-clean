import type { User, Notice } from "./types";

let _users: User[] = [
  {
    id: "u1",
    email: "new@company.com",
    displayName: "",
    status: "pending",
    createdAt: new Date().toISOString(),
  },
];

let _notices: Notice[] = [];

export const repo = {
  users: {
    list: () => _users,
    pending: () => _users.filter(u => u.status === "pending"),
    approved: () => _users.filter(u => u.status === "approved"),
    upsert: (u: User) => {
      const i = _users.findIndex(x => x.id === u.id);
      if (i === -1) _users.push(u); else _users[i] = u;
      return u;
    },
    approve: (id: string, displayName: string) => {
      const u = _users.find(x => x.id === id);
      if (!u) throw new Error("not found");
      u.status = "approved";
      u.displayName = displayName;
      return u;
    },
    reject: (id: string) => {
      const u = _users.find(x => x.id === id);
      if (!u) throw new Error("not found");
      u.status = "rejected";
      return u;
    },
  },
  notices: {
    list: () =>
      _notices
        .filter(n => n.visible !== false)
        .sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0) || (b.updatedAt||b.createdAt).localeCompare(a.updatedAt||a.createdAt)),
    get: (id: string) => _notices.find(n => n.id === id),
    create: (n: Notice) => { _notices.push(n); return n; },
    update: (id: string, patch: Partial<Notice>) => {
      const n = _notices.find(x => x.id === id); if (!n) throw new Error("not found");
      Object.assign(n, patch, { updatedAt: new Date().toISOString() });
      return n;
    },
    remove: (id: string) => { _notices = _notices.filter(x => x.id !== id); },
  },
};
