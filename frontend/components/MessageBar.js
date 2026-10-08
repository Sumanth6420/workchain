"use client";

import { useAuth } from "../lib/AuthContext";

export default function MessageBar() {
  const { message } = useAuth();
  return message ? <div className="message">{message}</div> : null;
}
