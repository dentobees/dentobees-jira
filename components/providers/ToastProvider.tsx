"use client";

import { Toaster } from "react-hot-toast";

export const ToastProvider = () => {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: "#ffffff",
          color: "#172b4d",
          border: "1px solid #dfe1e6",
          borderRadius: "3px",
          fontSize: "14px",
        },
      }}
    />
  );
};
