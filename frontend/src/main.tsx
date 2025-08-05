import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/mmtec-theme.css";
import "./styles/globals.css";

console.log(" Main.tsx carregando...");

const rootElement = document.getElementById("root");
console.log(" Root element encontrado:", rootElement);

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log(" App renderizado com sucesso!");
} else {
  console.error(" Elemento root não encontrado!");
}
