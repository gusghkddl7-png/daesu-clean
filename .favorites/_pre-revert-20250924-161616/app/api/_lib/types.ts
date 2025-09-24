export type User = {
  id: string;
  email: string;
  displayName: string; // 담당자 이름
  status: "pending" | "approved" | "disabled" | "rejected";
  createdAt: string;
};

export type Notice = {
  id: string;
  title: string;
  body: string;
  pinned?: boolean;
  visible?: boolean;
  createdAt: string;
  updatedAt?: string;
};
