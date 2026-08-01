import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BookmarkLibrary } from "./BookmarkLibrary";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BookmarkLibrary />
  </StrictMode>,
);
