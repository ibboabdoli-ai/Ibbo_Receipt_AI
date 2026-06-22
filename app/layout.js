import React from "react";

export default function RootLayout({ children }) {
  return React.createElement("html", { lang: "en" }, React.createElement("body", null, children));
}
